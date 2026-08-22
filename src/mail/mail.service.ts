import { MailerService } from '@nestjs-modules/mailer';
import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export class MailService {
  private logger = new Logger(MailService.name);

  constructor(private readonly mailerService: MailerService) {}

  async sendVerificationEmail(to: string, otp: string) {
    try {
      await this.mailerService.sendMail({
        to,
        subject: 'Verify your SyncNotes Account',
        template: 'verification',
        context: { otp },
      });
      this.logger.log('Verification email sent to ' + to);
    } catch (error) {
      this.logger.error('Failed to send verification email', error);
    }
  }

  async sendPasswordResetEmail(to: string, resetLink: string) {
    try {
      await this.mailerService.sendMail({
        to,
        subject: 'Reset your SyncNotes Password',
        template: 'password-reset',
        context: { resetLink },
      });
      this.logger.log('Password reset email sent to ' + to);
    } catch (error) {
      this.logger.error('Failed to send password reset email', error);
    }
  }
}
