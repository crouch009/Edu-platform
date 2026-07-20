import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

/**
 * Minimal SMS abstraction over Twilio. Without TWILIO_* env vars set, it
 * just logs the message so you can see what would have been sent during
 * development. Install `twilio` and set the env vars to go live:
 *
 *   npm install twilio
 */
@Injectable()
export class SmsService {
  private readonly logger = new Logger(SmsService.name);

  constructor(private config: ConfigService) {}

  private isConfigured() {
    return !!(
      this.config.get('TWILIO_ACCOUNT_SID') &&
      this.config.get('TWILIO_AUTH_TOKEN') &&
      this.config.get('TWILIO_FROM_NUMBER')
    );
  }

  async sendSms(to: string, body: string) {
    if (!this.isConfigured()) {
      this.logger.warn(`[DEV MODE - no SMS provider configured] SMS to ${to}: ${body}`);
      return;
    }

    try {
      const twilio = await import('twilio');
      const client = twilio.default(
        this.config.get('TWILIO_ACCOUNT_SID'),
        this.config.get('TWILIO_AUTH_TOKEN'),
      );
      await client.messages.create({
        to,
        from: this.config.get('TWILIO_FROM_NUMBER'),
        body,
      });
    } catch (err) {
      this.logger.error(
        `TWILIO_* env vars are set but the 'twilio' package isn't installed. Run: npm install twilio`,
      );
      this.logger.warn(`[Falling back to console log] SMS to ${to}: ${body}`);
    }
  }
}
