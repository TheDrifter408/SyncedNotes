import { Module } from '@nestjs/common';
import { SyncService } from './sync.service';
import { SyncController } from './sync.controller';
import { SyncHandlerRegistryService } from './sync-handler-registry.service';
import { NotesSyncHandler } from './handlers/notes-sync.handler';
import { FoldersSyncHandler } from './handlers/folders-sync.handler';
import { EdgeSyncHandler } from './handlers/edge-sync.handler';
import { Prisma } from '@/prisma/prisma.service';

@Module({
  controllers: [SyncController],
  providers: [
    Prisma,
    SyncService,
    SyncHandlerRegistryService,
    NotesSyncHandler,
    FoldersSyncHandler,
    EdgeSyncHandler,
  ],
  exports: [SyncService],
})
export class SyncModule {}
