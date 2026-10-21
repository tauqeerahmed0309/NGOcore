const Agenda = require('agenda');
const env = require('../config/env');
const logger = require('../config/logger');

const agenda = new Agenda({
  db: { address: env.MONGODB_URI, collection: 'agendaJobs' },
  processEvery: '1 minute',
});

agenda.on('ready', () => {
  logger.info('Agenda connected to MongoDB and ready to process jobs.');
});

agenda.on('error', (err) => {
  logger.error('Agenda connection error: ' + err.message);
});

module.exports = agenda;
