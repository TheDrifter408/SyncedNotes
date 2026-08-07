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
      useFactory: (config: ConfigService) => {
        const host = config.get<string>('MAIL_HOST', 'localhost');
        const port = config.get<number>('MAIL_PORT', 1025);
        const user = config.get<string>('MAIL_USER', 'dev');
        const pass = config.get<string>('MAIL_PASS', 'dev');
        const from = config.get<string>(
          'MAIL_FROM',
          'SyncNotes <noreply@syncnotes.com>',
        );
        const isDev = config.get<string>('NODE_ENV') !== 'production';
        const transport = {
          host,
          port,
          secure: false,
          auth: {
            user,
            pass,
          },
        };
        return {
          transport,
          defaults: {
            from,
          },
          template: {
            dir: isDev
              ? join(process.cwd(), 'src', 'mail', 'templates')
              : join(__dirname, 'templates'),
            adapter: new HandlebarsAdapter(),
            options: { strict: true },
          },
        };
      },
    }),
  ],
  providers: [MailService],
  exports: [MailService],
})
export class MailModule {}
