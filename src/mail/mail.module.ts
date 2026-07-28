import { Global, Module } from '@nestjs/common';
import { MailService } from './mail.service';
import { MailerModule } from '@nestjs-modules/mailer';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { HandlebarsAdapter } from '@nestjs-modules/mailer/adapters/handlebars.adapter';
import { join } from 'path';

@Global()
@Module({
  imports: [
    MailerModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        transport: {
          host: config.get<string>('MAIL_HOST', 'localhost'),
          port: config.get<number>('MAIL_PORT', 1025),
          secure: false,
          auth: {
            user: config.get<string>('MAIL_USER', 'dev'),
            pass: config.get<string>('MAIL_PASSWORD', 'dev'),
          },
        },
        defaults: {
          from: config.get<string>(
            'MAIL_FROM',
            'SyncNotes <noreply@syncnotes.com>',
          ),
        },
        template: {
          dir: join(__dirname, 'templates'),
          adapter: new HandlebarsAdapter(),
          options: {
            strict: true,
          },
        },
      }),
    }),
  ],
  providers: [MailService],
  exports: [MailerModule],
})
export class MailModule {}
