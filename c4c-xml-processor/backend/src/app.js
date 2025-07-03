const express = require('express');
const cors = require('cors');
const path = require('path');
const logger = require('./utils/logger');
const models = require('./models');

// Import routes
const processRoutes = require('./routes/process');
const reportRoutes = require('./routes/reports');

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json({ limit: '150mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Static files
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// Routes
app.use('/api/process', processRoutes);
app.use('/api/reports', reportRoutes);

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    version: '1.0.0'
  });
});

// Error handling middleware
app.use((error, req, res, next) => {
  logger.error('Unhandled error:', error);
  res.status(500).json({
    success: false,
    error: 'Internal server error',
    message: error.message
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    error: 'Route not found'
  });
});

// Database connection and server startup
async function startServer() {
  try {
    // Test database connection
    await models.sequelize.authenticate();
    logger.info('Database connection established successfully');

    // Sync database models (create tables if they don't exist)
    await models.sequelize.sync({ alter: false });
    logger.info('Database models synchronized');

    // Start server
    app.listen(PORT, () => {
      logger.info(`Server running on port ${PORT}`);
      logger.info(`Health check: http://localhost:${PORT}/api/health`);
      logger.info(`Process API: http://localhost:${PORT}/api/process/status`);
    });

  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
}

// Handle graceful shutdown
process.on('SIGTERM', async () => {
  logger.info('SIGTERM received, shutting down gracefully');
  await models.sequelize.close();
  process.exit(0);
});

process.on('SIGINT', async () => {
  logger.info('SIGINT received, shutting down gracefully');
  await models.sequelize.close();
  process.exit(0);
});

// Start the server
startServer();

module.exports = app; 