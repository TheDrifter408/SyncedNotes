import { Module } from '@nestjs/common';
import { EdgeService } from './edge.service';
import { EdgeController } from './edge.controller';
import { Prisma } from '@/prisma/prisma.service';

@Module({
  controllers: [EdgeController],
  providers: [EdgeService, Prisma],
})
export class EdgeModule {}
