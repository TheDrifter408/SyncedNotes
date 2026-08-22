import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ConfigModule } from '@nestjs/config';
import { Prisma } from './prisma/prisma.service';
import { NotesModule } from './notes/notes.module';
import { AuthModule } from './auth/auth.module';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { TransformResponseInterceptor } from './interceptors/transformResponse.interceptor';
import { FoldersModule } from './folders/folders.module';
import { MailModule } from './mail/mail.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      envFilePath: '.env.local',
    }),
    NotesModule,
    AuthModule,
    FoldersModule,
    MailModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    Prisma,
    {
      provide: APP_INTERCEPTOR,
      useClass: TransformResponseInterceptor,
    },
  ],
})
export class AppModule {}
