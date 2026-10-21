const { queueEmail } = require('../../jobs/emailJob');
const env = require('../../config/env');
const { formatDateTimeIST } = require('../../utils/format');

const sendNgoStatusNotificationEmail = async ({ to, ngoName, status, reason }) => {
  let subject = '';
  let headline = '';
  let bodyContent = '';
  let ctaText = 'Visit Platform';
  let ctaUrl = env.CLIENT_URL;

  switch (status) {
    case 'approved':
      subject = `🎉 Application Approved: Welcome ${ngoName} to NGOcore!`;
      headline = 'Your NGO Account Has Been Approved';
      bodyContent = `
        <p>We are delighted to inform you that your organization verification documents have been reviewed and approved.</p>
        <p>You can now log in to access your organization dashboard, manage beneficiary records, invite team members, and leverage AI insights.</p>
      `;
      ctaText = 'Log In to Dashboard';
      ctaUrl = `${env.CLIENT_URL}/login`;
      break;

    case 'rejected':
      subject = `Update regarding your NGOcore application: ${ngoName}`;
      headline = 'Application Status: Not Approved';
      bodyContent = `
        <p>Thank you for your interest in joining NGOcore. After reviewing your organization documents, our review committee was unable to approve your application at this time.</p>
        <p><strong>Reason provided:</strong> ${reason || 'Details provided did not meet minimum verification requirements.'}</p>
        <p>If you believe this was in error, please contact our support desk.</p>
      `;
      break;

    case 're-upload-required':
      subject = `Action Required: Additional Documents Needed for ${ngoName}`;
      headline = 'Additional Verification Required';
      bodyContent = `
        <p>Our review team examined your application and requires additional or clearer documentation before approval can proceed.</p>
        <p><strong>Instructions from reviewer:</strong> ${reason || 'Please provide updated certificates or higher resolution document scans.'}</p>
        <p>Please log in to your account and re-submit the required documents.</p>
      `;
      ctaText = 'Upload Documents';
      ctaUrl = `${env.CLIENT_URL}/onboarding`;
      break;

    case 'suspended':
      subject = `Important Notice: Account Suspended for ${ngoName}`;
      headline = 'Account Suspended';
      bodyContent = `
        <p>Your NGO account has been suspended by the platform administration.</p>
        <p><strong>Reason:</strong> ${reason || 'Violation of platform terms of service or compliance standards.'}</p>
        <p>Access to API routes and record management is currently restricted. Please contact platform administration for assistance.</p>
      `;
      break;

    default:
      subject = `Status Update for ${ngoName}`;
      headline = `Status Changed to ${status}`;
      bodyContent = `<p>Your organization status has been updated to: <strong>${status}</strong>.</p>`;
  }

  const html = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #E2E8F0; rounded: 12px; background-color: #ffffff;">
      <div style="text-align: center; padding-bottom: 20px; border-bottom: 1px solid #EDF2F7;">
        <h1 style="color: #4F46E5; margin: 0; font-size: 24px;">NGOcore</h1>
      </div>
      <div style="padding: 24px 0;">
        <h2 style="color: #1A202C; margin-top: 0;">${headline}</h2>
        <div style="color: #4A5568; line-height: 1.6; font-size: 15px;">
          ${bodyContent}
        </div>
        ${ctaUrl ? `
          <div style="margin-top: 28px; text-align: center;">
            <a href="${ctaUrl}" style="background-color: #4F46E5; color: #ffffff; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: 600; display: inline-block;">
              ${ctaText}
            </a>
          </div>
        ` : ''}
      </div>
      <div style="margin-top: 20px; padding-top: 16px; border-top: 1px solid #EDF2F7; text-align: center; color: #A0AEC0; font-size: 12px;">
        <p style="margin: 0 0 4px;">Timestamp: ${formatDateTimeIST(new Date())} IST</p>
        <p style="margin: 0 0 4px;">India Compliance Desk: <a href="tel:+9118005550199" style="color: #4F46E5;">+91 1800 555 0199</a> | support@ngocore.org</p>
        <p style="margin: 0;">&copy; ${new Date().getFullYear()} NGOcore India. Governed under DPDP Act 2023.</p>
      </div>
    </div>
  `;

  await queueEmail({ to, subject, html });
};

module.exports = {
  sendNgoStatusNotificationEmail
};
