import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private transporter: nodemailer.Transporter;
  private readonly fromAddress: string;
  private readonly appUrl: string;

  constructor(private config: ConfigService) {
    this.fromAddress = this.config.get('EMAIL_FROM') || 'noreply@pitchonix.com';
    this.appUrl = this.config.get('FRONTEND_URL') || 'http://localhost:3002';

    const host = this.config.get('SMTP_HOST');
    const port = parseInt(this.config.get('SMTP_PORT') || '587');
    const user = this.config.get('SMTP_USER');
    const pass = this.config.get('SMTP_PASS');

    if (host && user && pass) {
      this.transporter = nodemailer.createTransport({ host, port, auth: { user, pass } });
    } else {
      // Dev fallback — log emails to console
      this.transporter = nodemailer.createTransport({ jsonTransport: true });
    }
  }

  async sendRaw(to: string, subject: string, html: string) {
    return this.send(to, subject, html);
  }

  private async send(to: string, subject: string, html: string) {
    try {
      const info = await this.transporter.sendMail({ from: this.fromAddress, to, subject, html });
      if ((info as any).message) {
        // jsonTransport — log for dev
        this.logger.log(`[DEV EMAIL] To: ${to} | Subject: ${subject}\n${(info as any).message}`);
      }
    } catch (err) {
      this.logger.error(`Failed to send email to ${to}`, err);
    }
  }

  async sendVerificationEmail(to: string, token: string) {
    const url = `${this.appUrl}/verify-email?token=${token}`;
    await this.send(
      to,
      'Verify your Pitchonix account',
      `<div style="font-family:sans-serif;max-width:480px;margin:auto">
        <h2>Verify your email</h2>
        <p>Click the button below to verify your Pitchonix account:</p>
        <a href="${url}" style="display:inline-block;background:#7C3AED;color:white;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600">Verify Email</a>
        <p style="color:#6B7280;font-size:13px;margin-top:16px">Link expires in 24 hours. If you didn't create an account, ignore this email.</p>
      </div>`,
    );
  }

  async sendPasswordResetEmail(to: string, token: string) {
    const url = `${this.appUrl}/reset-password?token=${token}`;
    await this.send(
      to,
      'Reset your Pitchonix password',
      `<div style="font-family:sans-serif;max-width:480px;margin:auto">
        <h2>Reset your password</h2>
        <p>Click the button below to set a new password:</p>
        <a href="${url}" style="display:inline-block;background:#7C3AED;color:white;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600">Reset Password</a>
        <p style="color:#6B7280;font-size:13px;margin-top:16px">Link expires in 1 hour. If you didn't request this, ignore this email.</p>
      </div>`,
    );
  }

  async sendMagicLinkEmail(to: string, token: string) {
    const url = `${this.appUrl}/magic-link?token=${token}`;
    await this.send(
      to,
      'Your Pitchonix sign-in link',
      `<div style="font-family:sans-serif;max-width:480px;margin:auto">
        <h2>Sign in to Pitchonix</h2>
        <p>Click the button below to sign in instantly — no password needed:</p>
        <a href="${url}" style="display:inline-block;background:#7C3AED;color:white;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600">Sign In</a>
        <p style="color:#6B7280;font-size:13px;margin-top:16px">Link expires in 15 minutes and can only be used once.</p>
      </div>`,
    );
  }

  async sendShareInviteEmail(to: string, inviterName: string, projectName: string, role: string) {
    const url = `${this.appUrl}/projects`;
    await this.send(
      to,
      `${inviterName} shared a project with you on Pitchonix`,
      `<div style="font-family:sans-serif;max-width:480px;margin:auto">
        <h2>You've been invited!</h2>
        <p><strong>${inviterName}</strong> invited you to collaborate on <strong>${projectName}</strong> as a <strong>${role}</strong>.</p>
        <a href="${url}" style="display:inline-block;background:#7C3AED;color:white;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600">View Project</a>
      </div>`,
    );
  }
}
