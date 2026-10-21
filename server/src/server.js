const app = require('./app');
const env = require('./config/env');
const connectDB = require('./config/db');
const logger = require('./config/logger');
const agenda = require('./jobs/agenda');
require('./jobs/emailJob'); // Load job definitions

let server;

const startServer = async () => {
  try {
    // Connect to MongoDB
    await connectDB();

    // Start Agenda Job Scheduler
    await agenda.start();
    logger.info('Agenda scheduler started');

    // Start listening
    server = app.listen(env.PORT, () => {
      logger.info(`Server is running on port ${env.PORT} in ${env.NODE_ENV} mode`);
    });
  } catch (error) {
    logger.error(`Error starting server: ${error.message}`);
    process.exit(1);
  }
};

startServer();

// Handle unhandled promise rejections
process.on('unhandledRejection', async (err) => {
  logger.error(`Unhandled Rejection: ${err.name} | ${err.message}`);
  await agenda.stop();
  if (server) {
    server.close(() => {
      process.exit(1);
    });
  } else {
    process.exit(1);
  }
});

// Handle uncaught exceptions
process.on('uncaughtException', async (err) => {
  logger.error(`Uncaught Exception: ${err.name} | ${err.message}`);
  await agenda.stop();
  process.exit(1);
});

// Graceful termination
process.on('SIGTERM', async () => {
  logger.info('SIGTERM received. Shutting down gracefully.');
  await agenda.stop();
  if (server) {
    server.close(() => {
      logger.info('Process terminated.');
      process.exit(0);
    });
  }
});

