import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import nodemailer, { Transporter } from 'nodemailer';

@Injectable()
export class MailerService {
  private readonly logger = new Logger(MailerService.name);
  private transporter?: Transporter;

  constructor(private readonly configService: ConfigService) {}

  private getTransporter(): Transporter | undefined {
    const host = this.configService.get<string>('SMTP_HOST');
    const user = this.configService.get<string>('SMTP_USER');
    const password = this.configService.get<string>('SMTP_PASSWORD');
    const port = this.configService.get<number>('SMTP_PORT') ?? 587;

    if (!host || !user || !password) {
      return undefined;
    }

    if (!this.transporter) {
      this.transporter = nodemailer.createTransport({
        host,
        port,
        secure: port === 465,
        auth: { user, pass: password },
      });
    }

    return this.transporter;
  }

  async sendMail(to: string, subject: string, text: string, html?: string): Promise<void> {
    const transporter = this.getTransporter();
    if (!transporter) {
      this.logger.warn(`SMTP not configured. Skipping email to ${to} with subject "${subject}".`);
      return;
    }

    await transporter.sendMail({
      from: this.configService.get<string>('SMTP_FROM'),
      to,
      subject,
      text,
      html,
    });
  }
}
