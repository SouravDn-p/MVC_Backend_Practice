import { ENV } from '../../../config/env.config.ts';
import { logger } from './logger.util.ts';

interface SendEmailParams {
  to: string;
  toName?: string;
  subject: string;
  htmlContent: string;
}

const BREVO_API_URL = 'https://api.brevo.com/v3/smtp/email';

const extractOtp = (html: string): string | undefined => {
  const match = html.match(/letter-spacing:\s*8px[^>]*>(\d{6})</);
  return match?.[1];
};

export const sendTransactionalEmail = async ({
  to,
  toName,
  subject,
  htmlContent,
}: SendEmailParams): Promise<void> => {
  if (!ENV.BREVO_API_KEY) {
    const otp = extractOtp(htmlContent);
    logger.warn(
      `[Brevo skipped] no BREVO_API_KEY. to=${to} subject=${subject}${otp ? ` OTP=${otp}` : ''}`,
    );
    return;
  }

  const response = await fetch(BREVO_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      'api-key': ENV.BREVO_API_KEY,
    },
    body: JSON.stringify({
      sender: { name: ENV.MAIL_FROM_NAME, email: ENV.MAIL_FROM },
      to: [{ email: to, name: toName || to }],
      subject,
      htmlContent,
    }),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    logger.error(`Brevo send failed (${response.status}): ${errorBody}`);
    if (!ENV.IS_PRODUCTION) {
      const otp = extractOtp(htmlContent);
      if (otp) logger.warn(`[Brevo failed — local OTP] ${otp}`);
    }
    throw new Error(`Failed to send email: ${response.status}`);
  }
};
