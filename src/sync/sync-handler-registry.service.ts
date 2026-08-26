import { ENTITY_TYPE } from '../constants';
import { Injectable } from '@nestjs/common';
import { SyncEntityHandler } from './handlers/sync-entity-handler';
import { NotesSyncHandler } from './handlers/notes-sync.handler';
import { FoldersSyncHandler } from './handlers/folders-sync.handler';
import { EdgeSyncHandler } from './handlers/edge-sync.handler';

@Injectable()
export class SyncHandlerRegistryService {
  private readonly handlers: Map<ENTITY_TYPE, SyncEntityHandler>;

  constructor(
    noteHandler: NotesSyncHandler,
    folderHandler: FoldersSyncHandler,
    edgeHandler: EdgeSyncHandler,
  ) {
    this.handlers = new Map<ENTITY_TYPE, SyncEntityHandler>([
      [ENTITY_TYPE.NOTE, noteHandler],
      [ENTITY_TYPE.FOLDER, folderHandler],
      [ENTITY_TYPE.EDGE, edgeHandler],
    ]);
  }
  get(entityType: ENTITY_TYPE): SyncEntityHandler {
    const handler = this.handlers.get(entityType);
    if (!handler) {
      throw new Error(`No handler found for entity type: ${entityType}`);
    }
    return handler;
  }
}
