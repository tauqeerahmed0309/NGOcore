const { queueEmail } = require('../../jobs/emailJob');

/**
 * Utility to send OTP verification email
 */
const sendOtpEmail = async (to, otp) => {
  const subject = 'Your Verification Code';
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2>Welcome to NGO Digital Record Management!</h2>
      <p>Your email verification code is:</p>
      <h1 style="color: #4A90E2; letter-spacing: 2px;">${otp}</h1>
      <p>This code will expire in 15 minutes.</p>
    </div>
  `;
  await queueEmail({ to, subject, html });
};

/**
 * Utility to send Password Reset email
 */
const sendPasswordResetEmail = async (to, resetUrl) => {
  const subject = 'Reset Your Password';
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2>Password Reset Request</h2>
      <p>Click the button below to reset your password. This link expires in 1 hour.</p>
      <a href="${resetUrl}" style="display: inline-block; padding: 10px 20px; background-color: #4A90E2; color: #fff; text-decoration: none; border-radius: 5px;">Reset Password</a>
    </div>
  `;
  await queueEmail({ to, subject, html });
};

module.exports = {
  sendOtpEmail,
  sendPasswordResetEmail
};
