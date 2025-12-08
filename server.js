// server.js
const express = require('express');
const cors = require('cors');
const yahooFinance = require('yahoo-finance2').default;
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 4000;

// --- Middleware ---
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true
}));
app.use(express.json());

// --- Simple health check ---
app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

/**
 * GET /api/news?category=all&limit=10&offset=0
 * GET /api/news?symbol=AAPL&limit=10&offset=0
 * Fetches Yahoo Finance news for a given symbol or category
 */
app.get('/api/news', async (req, res) => {
  const category = req.query.category || '';
  const symbol = req.query.symbol || (category === 'all' ? '^GSPC' : 'AAPL');
  const limit = parseInt(req.query.limit) || 20;
  const offset = parseInt(req.query.offset) || 0;

  try {
    // yahoo-finance2 search can return news along with other data
    const result = await yahooFinance.search(symbol.toString().toUpperCase(), {
      newsCount: limit + offset, // fetch more to handle offset
    });

    const news = result.news || [];

    // Apply offset and limit
    const slicedNews = news.slice(offset, offset + limit);

    // You can also map it to a simpler shape if you want:
    const simplified = slicedNews.map((item) => ({
      id: item.uuid,
      title: item.title,
      publisher: item.publisher,
      link: item.link,
      type: item.type,
      publishedAt: item.providerPublishTime
        ? new Date(item.providerPublishTime * 1000).toISOString()
        : null,
      relatedTickers: item.relatedTickers || [],
      thumbnail: item.thumbnail?.resolutions?.[0]?.url || null,
      // Raw item is still accessible if you want
      // raw: item,
    }));

    res.json({
      symbol,
      category,
      count: simplified.length,
      total: news.length,
      items: simplified,
    });
  } catch (error) {
    console.error('Error fetching Yahoo Finance news:', error);
    res.status(500).json({
      error: 'Failed to fetch Yahoo Finance news',
      details: error.message || String(error),
    });
  }
});

// (Optional) endpoint for general market news, not tied to one symbol
app.get('/api/news/market', async (req, res) => {
  try {
    // Use a major index as a proxy for "market" news
    const result = await yahooFinance.search('^GSPC', { newsCount: 20 });
    const news = result.news || [];

    const simplified = news.map((item) => ({
      id: item.uuid,
      title: item.title,
      publisher: item.publisher,
      link: item.link,
      type: item.type,
      publishedAt: item.providerPublishTime
        ? new Date(item.providerPublishTime * 1000).toISOString()
        : null,
      relatedTickers: item.relatedTickers || [],
      thumbnail: item.thumbnail?.resolutions?.[0]?.url || null,
    }));

    res.json({
      symbol: '^GSPC',
      count: simplified.length,
      items: simplified,
    });
  } catch (error) {
    console.error('Error fetching market news:', error);
    res.status(500).json({
      error: 'Failed to fetch market news',
      details: error.message || String(error),
    });
  }
});

// --- Start server ---
app.listen(PORT, () => {
  console.log(`Yahoo Finance backend running on http://localhost:${PORT}`);
});
