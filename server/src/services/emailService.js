const nodemailer = require('nodemailer');
const config = require('../config/env');

let testTransport = null;
let smtpTransport = null;

const getTransport = () => {
  if (testTransport && config.NODE_ENV !== 'production') return testTransport;
  if (!config.SMTP_HOST || !config.MAIL_FROM) {
    throw new Error('SMTP_HOST and MAIL_FROM must be configured to send email.');
  }
  if (!smtpTransport) {
    smtpTransport = nodemailer.createTransport({
      host: config.SMTP_HOST,
      port: config.SMTP_PORT,
      secure: config.SMTP_SECURE,
      auth: config.SMTP_USER ? {
        user: config.SMTP_USER,
        pass: config.SMTP_PASSWORD
      } : undefined
    });
  }
  return smtpTransport;
};

const sendSignupOtp = async (email, code) => {
  const transport = getTransport();
  await transport.sendMail({
    from: config.MAIL_FROM,
    to: email,
    subject: 'Your NGOcore verification code',
    text: `Your NGOcore verification code is ${code}. It expires in 10 minutes. If you did not request this, ignore this email.`,
    html: `<p>Your NGOcore verification code is:</p><p style="font-size:24px;font-weight:bold;letter-spacing:6px">${code}</p><p>It expires in 10 minutes. If you did not request this, ignore this email.</p>`
  });
};

const sendPasswordResetOtp = async (email, code) => {
  const transport = getTransport();
  await transport.sendMail({
    from: config.MAIL_FROM,
    to: email,
    subject: 'Your NGOcore password reset code',
    text: `Your NGOcore password reset code is ${code}. It expires in 10 minutes. If you did not request this, ignore this email.`,
    html: `<p>Your NGOcore password reset code is:</p><p style="font-size:24px;font-weight:bold;letter-spacing:6px">${code}</p><p>It expires in 10 minutes. If you did not request this, ignore this email.</p>`
  });
};

const sendStudentAccountSetup = async (email, setupUrl) => {
  const transport = getTransport();
  await transport.sendMail({
    from: config.MAIL_FROM,
    to: email,
    subject: 'Set up your NGOcore student account',
    text: `Your NGO invited you to use NGOcore. Set your password using this secure link within 24 hours: ${setupUrl}\nIf you were not expecting this invitation, ignore this email.`,
    html: `<p>Your NGO invited you to use NGOcore.</p><p><a href="${setupUrl}">Set up your password</a></p><p>This secure link expires in 24 hours. If you were not expecting this invitation, ignore this email.</p>`
  });
};

const setTransportForTesting = (transport) => {
  if (config.NODE_ENV === 'production') {
    throw new Error('Test email transports cannot be configured in production.');
  }
  testTransport = transport;
};

module.exports = { sendSignupOtp, sendPasswordResetOtp, sendStudentAccountSetup, setTransportForTesting };
