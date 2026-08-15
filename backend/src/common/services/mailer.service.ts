import { Injectable, Logger, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import nodemailer, { Transporter } from 'nodemailer';

type MailDetails = Array<{ label: string; value: string | number }>;

@Injectable()
export class MailerService {
  private readonly logger = new Logger(MailerService.name);
  private transporter?: Transporter;

  constructor(private readonly configService: ConfigService) {}

  assertConfigured(): void {
    if (!this.getSmtpSettings()) {
      throw new ServiceUnavailableException('Email delivery is temporarily unavailable because SMTP is not configured. Please contact the administrator.');
    }
  }

  async sendOtpEmail(to: string, options: { name?: string; otp: string; purpose: 'verify_email' | 'password_reset' }): Promise<void> {
    const verification = options.purpose === 'verify_email';
    await this.sendBrandedMail({
      to,
      subject: verification ? 'Verify your INVEXA business account' : 'Reset your INVEXA password',
      preheader: `${options.otp} is your INVEXA verification code. It expires in 10 minutes.`,
      heading: verification ? 'Verify your email address' : 'Password reset verification',
      greeting: options.name ? `Hello ${options.name},` : 'Hello,',
      intro: verification
        ? 'Thank you for registering your organization with INVEXA. Use the verification code below to confirm that you own this email address and activate the Business Owner account.'
        : 'We received a request to reset the password for your INVEXA account. Use the verification code below to continue securely.',
      otp: options.otp,
      notice: 'This code expires in 10 minutes and can only be used once. Never share it with anyone, including someone claiming to represent INVEXA.',
      closing: verification
        ? 'After verification, your organization and Business Owner account will be activated. You can then sign in and continue setting up your subscription.'
        : 'If you did not request a password reset, you can safely ignore this email. Your password will remain unchanged.',
    });
  }

  async sendSecurityNotice(to: string, options: { name?: string; event: 'password_reset' | 'password_changed' }): Promise<void> {
    const reset = options.event === 'password_reset';
    await this.sendBrandedMail({
      to,
      subject: reset ? 'Your INVEXA password was reset' : 'Your INVEXA password was changed',
      preheader: 'A security change was made to your INVEXA account.',
      heading: reset ? 'Password reset completed' : 'Password changed successfully',
      greeting: options.name ? `Hello ${options.name},` : 'Hello,',
      intro: reset
        ? 'Your INVEXA account password has been reset successfully. Existing sessions have been signed out to help protect your account.'
        : 'Your INVEXA account password has been changed successfully. Existing sessions have been signed out as a security precaution.',
      notice: 'If you did not make this change, contact your INVEXA administrator immediately and secure the email account associated with your profile.',
      closing: 'For your protection, INVEXA will never ask you to disclose your password or one-time verification code by email, phone, or chat.',
    });
  }

  async sendAccountCreated(to: string, options: { name: string; roleName?: string }): Promise<void> {
    await this.sendBrandedMail({
      to,
      subject: 'Welcome to INVEXA — your account is ready',
      preheader: 'Your INVEXA account has been created.',
      heading: 'Welcome to INVEXA',
      greeting: `Hello ${options.name},`,
      intro: 'An INVEXA account has been created for you by your organization. You can now sign in using this email address and the password provided to you securely by your administrator.',
      details: [
        { label: 'Sign-in email', value: to },
        ...(options.roleName ? [{ label: 'Assigned role', value: options.roleName }] : []),
      ],
      notice: 'For security, do not share your password. We recommend changing any temporary password immediately after your first sign-in.',
      closing: 'INVEXA brings your invoicing, inventory, customers, suppliers, and business insights together in one secure workspace.',
    });
  }

  async sendSubscriptionSubmitted(to: string, options: { recipientName?: string; audience: 'admin' | 'owner'; businessName: string; planName: string; billingCycle: string; amount: string | number; reference?: string; submittedBy?: string }): Promise<void> {
    const admin = options.audience === 'admin';
    await this.sendBrandedMail({
      to,
      subject: admin ? `Subscription review required — ${options.businessName}` : 'Your INVEXA subscription request was received',
      preheader: admin ? 'A new subscription request is ready for review.' : 'Your subscription request is awaiting review.',
      heading: admin ? 'New subscription request' : 'Subscription request received',
      greeting: options.recipientName ? `Hello ${options.recipientName},` : 'Hello,',
      intro: admin
        ? `${options.businessName} submitted a subscription request that is ready for administrative review.`
        : `We have received the subscription request for ${options.businessName}. The INVEXA team will review the submitted payment information before activating the plan.`,
      details: [
        { label: 'Organization', value: options.businessName },
        { label: 'Plan', value: options.planName },
        { label: 'Billing cycle', value: options.billingCycle },
        { label: 'Amount', value: options.amount },
        { label: 'Reference', value: options.reference || 'Not provided' },
        ...(options.submittedBy ? [{ label: 'Submitted by', value: options.submittedBy }] : []),
      ],
      notice: admin
        ? 'Review the payment evidence and organization details carefully before approving or rejecting this request.'
        : 'Do not make another payment for the same request while it is under review. You will see the updated status in your INVEXA subscription workspace.',
      closing: admin ? 'This is an automated operational notification from INVEXA.' : 'Thank you for choosing INVEXA to support your business operations.',
    });
  }

  async verifyConnection(): Promise<void> {
    this.assertConfigured();
    await this.getTransporter().verify();
    this.logger.log('SMTP connection verified successfully.');
  }

  private getSmtpSettings(): { host: string; port: number; user: string; password: string } | null {
    const host = this.configService.get<string>('SMTP_HOST')?.trim();
    const user = this.configService.get<string>('SMTP_USER')?.trim();
    const password = this.configService.get<string>('SMTP_PASSWORD')?.trim();
    const port = Number(this.configService.get<number>('SMTP_PORT') ?? 587);
    return host && user && password ? { host, port, user, password } : null;
  }

  private getTransporter(): Transporter {
    const settings = this.getSmtpSettings();
    if (!settings) {
      this.assertConfigured();
      throw new ServiceUnavailableException('Email delivery is unavailable.');
    }
    if (!this.transporter) {
      this.transporter = nodemailer.createTransport({
        host: settings.host,
        port: settings.port,
        secure: settings.port === 465,
        auth: { user: settings.user, pass: settings.password },
        requireTLS: settings.port === 587,
        connectionTimeout: 10_000,
        greetingTimeout: 10_000,
        socketTimeout: 20_000,
      });
    }
    return this.transporter;
  }

  private async sendBrandedMail(options: { to: string; subject: string; preheader: string; heading: string; greeting: string; intro: string; otp?: string; details?: MailDetails; notice?: string; closing?: string }): Promise<void> {
    try {
      await this.getTransporter().sendMail({
        from: this.configService.get<string>('SMTP_FROM') || `INVEXA <${this.configService.get<string>('SMTP_USER')}>`,
        to: options.to,
        subject: options.subject,
        text: this.renderText(options),
        html: this.renderTemplate(options),
      });
      this.logger.log(`Email delivered to ${options.to} with subject "${options.subject}".`);
    } catch (error) {
      if (error instanceof ServiceUnavailableException) throw error;
      this.logger.error(`Email delivery failed for ${options.to}: ${error instanceof Error ? error.message : String(error)}`);
      throw new ServiceUnavailableException('We could not send the email right now. Please try again shortly.');
    }
  }

  private renderTemplate(options: { preheader: string; heading: string; greeting: string; intro: string; otp?: string; details?: MailDetails; notice?: string; closing?: string }): string {
    const e = (value: string | number) => this.escapeHtml(String(value));
    const details = options.details?.length
      ? `<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin:24px 0;border-collapse:collapse;background:#f8fafc;border:1px solid #dbe7f3;border-radius:14px;overflow:hidden">${options.details.map((item) => `<tr><td style="padding:12px 16px;color:#64748b;font-size:13px;border-bottom:1px solid #e7eef6">${e(item.label)}</td><td style="padding:12px 16px;color:#0f172a;font-size:13px;font-weight:700;text-align:right;border-bottom:1px solid #e7eef6">${e(item.value)}</td></tr>`).join('')}</table>`
      : '';
    const otp = options.otp
      ? `<div style="margin:26px 0;padding:22px;text-align:center;border-radius:16px;background:linear-gradient(135deg,#064789,#427aa1);color:#fff"><div style="font-size:12px;text-transform:uppercase;letter-spacing:2px;opacity:.85">Your verification code</div><div style="margin-top:8px;font-size:34px;font-weight:800;letter-spacing:9px">${e(options.otp)}</div></div>`
      : '';
    const notice = options.notice
      ? `<div style="margin:24px 0;padding:16px 18px;border-left:4px solid #f59e0b;border-radius:10px;background:#fff8e6;color:#713f12;font-size:13px;line-height:1.65"><strong>Security notice</strong><br>${e(options.notice)}</div>`
      : '';
    return `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>${e(options.heading)}</title></head><body style="margin:0;background:#eef4f9;font-family:Inter,Segoe UI,Arial,sans-serif;color:#172033"><div style="display:none;max-height:0;overflow:hidden;opacity:0">${e(options.preheader)}</div><table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#eef4f9;padding:32px 12px"><tr><td align="center"><table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:620px;background:#fff;border-radius:22px;overflow:hidden;box-shadow:0 18px 45px rgba(6,71,137,.12)"><tr><td style="padding:28px 36px;background:linear-gradient(135deg,#042f5b,#064789 55%,#427aa1);color:#fff"><div style="font-size:25px;font-weight:800;letter-spacing:.5px">INVEXA</div><div style="margin-top:5px;font-size:12px;opacity:.82">Business operations, connected.</div></td></tr><tr><td style="padding:36px"><h1 style="margin:0 0 22px;color:#0f2f52;font-size:26px;line-height:1.25">${e(options.heading)}</h1><p style="margin:0 0 14px;font-size:15px;line-height:1.7">${e(options.greeting)}</p><p style="margin:0;font-size:15px;line-height:1.75;color:#475569">${e(options.intro)}</p>${otp}${details}${notice}${options.closing ? `<p style="margin:22px 0 0;font-size:14px;line-height:1.75;color:#475569">${e(options.closing)}</p>` : ''}<p style="margin:26px 0 0;font-size:14px;line-height:1.7">Kind regards,<br><strong>The INVEXA Team</strong></p></td></tr><tr><td style="padding:20px 36px;background:#f8fafc;border-top:1px solid #e7eef6;color:#64748b;font-size:11px;line-height:1.6;text-align:center">This automated message contains account-sensitive information. If you were not expecting it, do not forward or reply to it.<br>© ${new Date().getFullYear()} INVEXA. All rights reserved.</td></tr></table></td></tr></table></body></html>`;
  }

  private renderText(options: { heading: string; greeting: string; intro: string; otp?: string; details?: MailDetails; notice?: string; closing?: string }): string {
    return ['INVEXA', options.heading, '', options.greeting, options.intro, options.otp ? `Verification code: ${options.otp}` : '', ...(options.details?.map((item) => `${item.label}: ${item.value}`) ?? []), options.notice ? `Security notice: ${options.notice}` : '', options.closing || '', '', 'Kind regards,', 'The INVEXA Team'].filter(Boolean).join('\n');
  }

  private escapeHtml(value: string): string {
    return value.replace(/[&<>'"]/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' })[character]!);
  }
}
