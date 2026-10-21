const agenda = require('./agenda');
const transporter = require('../config/mail');
const logger = require('../config/logger');

const EMAIL_JOB_NAME = 'send-email';
const MAX_RETRIES = 3;

agenda.define(EMAIL_JOB_NAME, { priority: 'high', concurrency: 10 }, async (job) => {
  const { to, subject, html, text } = job.attrs.data;

  try {
    const info = await transporter.sendMail({
      from: process.env.EMAIL_FROM || '"NGO Platform" <no-reply@ngoplatform.com>',
      to,
      subject,
      text,
      html,
    });
    logger.info(`Email sent successfully to ${to}. MessageId: ${info.messageId}`);
  } catch (error) {
    logger.error(`Failed to send email to ${to}: ${error.message}`);
    throw error; // Triggers agenda's fail event for retries
  }
});

// Handle Retries
agenda.on(`fail:${EMAIL_JOB_NAME}`, async (err, job) => {
  job.attrs.failCount = job.attrs.failCount || 0;
  if (job.attrs.failCount < MAX_RETRIES) {
    // Retry in 5 minutes
    job.schedule('in 5 minutes');
    logger.info(`Scheduling retry ${job.attrs.failCount} for email to ${job.attrs.data.to}`);
    await job.save();
  } else {
    logger.error(`Max retries reached for email to ${job.attrs.data.to}. Giving up.`);
  }
});

/**
 * Queue an email to be sent asynchronously
 */
const queueEmail = async (options) => {
  const { to, subject, html, text } = options;
  await agenda.now(EMAIL_JOB_NAME, { to, subject, html, text });
};

module.exports = { queueEmail, EMAIL_JOB_NAME };
