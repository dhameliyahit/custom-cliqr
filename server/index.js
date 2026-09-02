require('dotenv').config();
const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const compression = require('compression');
const path = require('path');
const fs = require('fs');
const connectDB = require('./config/db');

// Route imports
const authRoutes = require('./routes/authRoutes');
const adminRoutes = require('./routes/adminRoutes');
const qrRoutes = require('./routes/qrRoutes');
const { router: redirectRoutes, handleRedirect } = require('./routes/redirectRoutes');

// Initialize app
const app = express();
const PORT = process.env.PORT || 5000;

// Connect to Database
connectDB();

// Middleware
app.use(compression());
app.use(cors({ origin: true, credentials: true }));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
if (process.env.NODE_ENV !== 'test') {
  app.use(morgan('dev'));
}

// Health check
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'healthy', uptime: process.uptime(), timestamp: new Date() });
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/admins', adminRoutes);
app.use('/api/qr', qrRoutes);

// Redirection Routes
// 1. /r/:code (e.g. http://localhost:5000/r/CC-9X7K2P)
app.use(redirectRoutes);

// 2. Direct root short-code (e.g. http://qr.customcliq.com/CC-9X7K2P)
app.get('/:code', (req, res, next) => {
  const { code } = req.params;
  if (code && code.toUpperCase().startsWith('CC-')) {
    return handleRedirect(req, res);
  }
  next();
});

// Serve static files from React build directory
const clientDist = path.join(__dirname, '../client/dist');
const indexPath = path.join(clientDist, 'index.html');

if (fs.existsSync(clientDist)) {
  app.use(express.static(clientDist));

  // Fallback for Single Page Applications (SPA)
  app.use((req, res, next) => {
    if (
      req.method === 'GET' &&
      !req.path.startsWith('/api') &&
      !req.path.startsWith('/health') &&
      !req.path.startsWith('/r/')
    ) {
      if (fs.existsSync(indexPath)) {
        return res.sendFile(indexPath);
      }
    }
    next();
  });
} else {
  // If client is not yet built, provide API Engine status on root
  app.get('/', (req, res) => {
    res.json({
      name: 'CustomCliq NFC & QR Code API Engine',
      version: '1.0.0',
      status: 'Running',
      note: 'Frontend not built. Run "npm run build" to build and serve the client.',
    });
  });
}

// 404 Handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: `Cannot ${req.method} ${req.originalUrl}`,
  });
});

// Global Error Handler
app.use((err, req, res, next) => {
  console.error('[Global Error]:', err.stack || err);
  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Internal Server Error',
  });
});

// Start Server
app.listen(PORT, () => {
  console.log(`[CustomCliq Server]: Running on http://localhost:${PORT}`);
});
