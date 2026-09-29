const nodemailer = require('nodemailer');

/**
 * Utility to send emails via Nodemailer.
 * Supports configured SMTP server or falls back to an Ethereal test account for local testing.
 * Also prints the direct action link to the console for quick testing and demonstration.
 */
const sendEmail = async ({ to, subject, html, text }) => {
  let transporter;

  // Check if custom SMTP credentials are provided in environment
  if (process.env.EMAIL_HOST && process.env.EMAIL_USER && process.env.EMAIL_PASSWORD) {
    transporter = nodemailer.createTransport({
      host: process.env.EMAIL_HOST,
      port: Number(process.env.EMAIL_PORT) || 587,
      secure: Number(process.env.EMAIL_PORT) === 465,
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASSWORD
      }
    });
  } else {
    // Generate a real test SMTP service account from Ethereal for testing without real credentials
    const testAccount = await nodemailer.createTestAccount();
    transporter = nodemailer.createTransport({
      host: testAccount.smtp.host,
      port: testAccount.smtp.port,
      secure: testAccount.smtp.secure,
      auth: {
        user: testAccount.user,
        pass: testAccount.pass
      }
    });
  }

  const mailOptions = {
    from: process.env.EMAIL_FROM || '"MERN Auth System" <no-reply@mernauth.dev>',
    to,
    subject,
    text,
    html
  };

  const info = await transporter.sendMail(mailOptions);

  console.log(`[Email Delivered] Message ID: ${info.messageId}`);
  const previewUrl = nodemailer.getTestMessageUrl(info);
  if (previewUrl) {
    console.log(`[Ethereal Inbox Preview]: ${previewUrl}`);
  }

  return {
    success: true,
    messageId: info.messageId,
    previewUrl
  };
};

module.exports = sendEmail;
