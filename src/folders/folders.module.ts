import { Module } from '@nestjs/common';
import { FoldersService } from './folders.service';
import { FoldersController } from './folders.controller';
import { Prisma } from '@/prisma/prisma.service';

@Module({
  controllers: [FoldersController],
  providers: [FoldersService, Prisma],
})
export class FoldersModule {}
