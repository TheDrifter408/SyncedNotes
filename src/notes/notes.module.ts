import { Module } from '@nestjs/common';
import { NotesService } from './notes.service';
import { NotesController } from './notes.controller';
import { Prisma } from 'src/prisma/prisma.service';
import { SyncService } from './sync.service';

@Module({
  controllers: [NotesController],
  providers: [NotesService, SyncService, Prisma],
})
export class NotesModule {}
