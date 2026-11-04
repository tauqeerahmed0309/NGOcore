const app = require('./app');
const config = require('./config/env');
const { connectDB } = require('./config/db');
const logger = require('./utils/logger');

const startServer = async () => {
  // Connect to Database
  await connectDB();

  // Start HTTP Listener on 0.0.0.0 (required for Render / cloud containers)
  const server = app.listen(config.PORT, '0.0.0.0', () => {
    logger.info(`====================================================`);
    logger.info(` NGOcore API Server is Running!`);
    logger.info(` Mode: [${config.NODE_ENV}]`);
    logger.info(` Host: [0.0.0.0]`);
    logger.info(` Port: [${config.PORT}]`);
    logger.info(` Health Check: http://localhost:${config.PORT}/api/v1/health`);
    logger.info(`====================================================`);
  });

  // Handle Unhandled Promise Rejections
  process.on('unhandledRejection', (err) => {
    logger.error('Unhandled Promise Rejection:', err.message || err);
    // Graceful exit
    server.close(() => process.exit(1));
  });

  // Handle SIGTERM / SIGINT for graceful shutdown
  const handleShutdown = () => {
    logger.info('Received shutdown signal. Closing HTTP server gracefully...');
    server.close(() => {
      logger.info('HTTP server closed.');
      process.exit(0);
    });
  };

  process.on('SIGTERM', handleShutdown);
  process.on('SIGINT', handleShutdown);
};

startServer();
