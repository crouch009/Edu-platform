import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

/**
 * Minimal mailer abstraction. By default (no RESEND_API_KEY set) it just
 * logs the email to the console so you can copy the reset link during
 * development. Plug in a real provider before production:
 *
 *   npm install resend
 *   import { Resend } from 'resend';
 *   const resend = new Resend(this.config.get('RESEND_API_KEY'));
 *   await resend.emails.send({ from: '...', to, subject, html });
 *
 * Any provider (SendGrid, Postmark, AWS SES) works the same way - swap
 * the body of sendMail() below.
 */
@Injectable()
export class MailerService {
  private readonly logger = new Logger(MailerService.name);

  constructor(private config: ConfigService) {}

  async sendMail(to: string, subject: string, html: string) {
    const apiKey = this.config.get('RESEND_API_KEY');
    if (!apiKey) {
      this.logger.warn(`[DEV MODE - no email provider configured] Email to ${to}`);
      this.logger.warn(`Subject: ${subject}`);
      this.logger.warn(`Body:\n${html}`);
      return;
    }

    try {
      // Dynamic import so the project builds fine even before `npm install resend`
      // has been run. Once installed, this branch sends the real email.
      const { Resend } = await import('resend');
      const resend = new Resend(apiKey);
      const from = this.config.get('MAIL_FROM') || 'no-reply@yourdomain.com';
      const { error } = await resend.emails.send({ from, to, subject, html });
      if (error) {
        this.logger.error(`Failed to send email to ${to}: ${JSON.stringify(error)}`);
      }
    } catch (err) {
      this.logger.error(
        `RESEND_API_KEY is set but the 'resend' package isn't installed. Run: npm install resend`,
      );
      this.logger.warn(`[Falling back to console log] Email to ${to}`);
      this.logger.warn(`Subject: ${subject}`);
      this.logger.warn(`Body:\n${html}`);
    }
  }

  async sendPasswordResetEmail(to: string, resetUrl: string) {
    const html = `
      <div dir="rtl" style="font-family: Arial, sans-serif;">
        <h2>إعادة تعيين كلمة المرور</h2>
        <p>وصلنا طلب لإعادة تعيين كلمة المرور الخاصة بحسابك.</p>
        <p><a href="${resetUrl}">اضغط هنا لإعادة تعيين كلمة المرور</a></p>
        <p>هذا الرابط صالح لمدة ساعة واحدة فقط. لو لم تطلب ذلك، تجاهل هذه الرسالة.</p>
      </div>
    `;
    await this.sendMail(to, 'إعادة تعيين كلمة المرور', html);
  }
}
