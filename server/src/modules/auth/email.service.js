const { queueEmail } = require('../../jobs/emailJob');
const { formatDateTimeIST } = require('../../utils/format');

/**
 * Utility to send OTP verification email (Localized for India)
 */
const sendOtpEmail = async (to, otp) => {
  const istTime = formatDateTimeIST(new Date());
  const subject = 'Your NGOcore Verification Code';
  const html = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; border: 1px solid #E2E8F0; border-radius: 12px; background-color: #ffffff;">
      <div style="text-align: center; padding-bottom: 20px; border-bottom: 1px solid #EDF2F7;">
        <h1 style="color: #4F46E5; margin: 0; font-size: 24px;">NGOcore</h1>
        <p style="color: #64748B; font-size: 12px; margin: 4px 0 0;">Digital Record & AI Vault &bull; India Compliance Desk</p>
      </div>
      <div style="padding: 24px 0; text-align: center;">
        <h2 style="color: #0F172A; margin-top: 0; font-size: 20px;">Welcome to NGOcore!</h2>
        <p style="color: #475569; font-size: 14px; line-height: 1.6;">Your 6-digit email verification code for secure NGO onboarding is:</p>
        <div style="display: inline-block; padding: 14px 28px; background: #F1F5F9; border-radius: 10px; margin: 16px 0; border: 1px dashed #4F46E5;">
          <h1 style="color: #4F46E5; letter-spacing: 6px; margin: 0; font-size: 32px; font-family: monospace;">${otp}</h1>
        </div>
        <p style="color: #64748B; font-size: 13px;">This code will expire in <strong>15 minutes</strong>.</p>
        <p style="color: #94A3B8; font-size: 11px;">Requested at: ${istTime} IST</p>
      </div>
      <div style="margin-top: 20px; padding-top: 16px; border-top: 1px solid #EDF2F7; text-align: center; color: #94A3B8; font-size: 11px; line-height: 1.5;">
        <p>If you did not request this verification code, please ignore this email or contact our India Support Desk at <a href="tel:+9118005550199" style="color: #4F46E5;">+91 1800 555 0199</a>.</p>
        <p>&copy; ${new Date().getFullYear()} NGOcore India. Governed under Digital Personal Data Protection Act (DPDP Act, 2023).</p>
      </div>
    </div>
  `;
  await queueEmail({ to, subject, html });
};

/**
 * Utility to send Password Reset email (Localized for India)
 */
const sendPasswordResetEmail = async (to, resetUrl) => {
  const istTime = formatDateTimeIST(new Date());
  const subject = 'Reset Your NGOcore Vault Password';
  const html = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; border: 1px solid #E2E8F0; border-radius: 12px; background-color: #ffffff;">
      <div style="text-align: center; padding-bottom: 20px; border-bottom: 1px solid #EDF2F7;">
        <h1 style="color: #4F46E5; margin: 0; font-size: 24px;">NGOcore</h1>
        <p style="color: #64748B; font-size: 12px; margin: 4px 0 0;">Digital Record & AI Vault</p>
      </div>
      <div style="padding: 24px 0;">
        <h2 style="color: #0F172A; margin-top: 0; font-size: 20px;">Password Reset Request</h2>
        <p style="color: #475569; font-size: 14px; line-height: 1.6;">We received a request to reset the master password for your NGO administrator account. Click the button below to proceed:</p>
        <div style="margin: 24px 0; text-align: center;">
          <a href="${resetUrl}" style="display: inline-block; padding: 12px 24px; background-color: #4F46E5; color: #ffffff; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 14px;">Reset Password</a>
        </div>
        <p style="color: #64748B; font-size: 13px;">This link is valid for <strong>1 hour</strong>.</p>
        <p style="color: #94A3B8; font-size: 11px;">Requested at: ${istTime} IST</p>
      </div>
      <div style="margin-top: 20px; padding-top: 16px; border-top: 1px solid #EDF2F7; text-align: center; color: #94A3B8; font-size: 11px; line-height: 1.5;">
        <p>Helpline: <a href="tel:+9118005550199" style="color: #4F46E5;">+91 1800 555 0199</a> | Email: <a href="mailto:support@ngocore.org" style="color: #4F46E5;">support@ngocore.org</a></p>
        <p>&copy; ${new Date().getFullYear()} NGOcore. DPDP Act (2023) Compliant.</p>
      </div>
    </div>
  `;
  await queueEmail({ to, subject, html });
};

module.exports = {
  sendOtpEmail,
  sendPasswordResetEmail
};
