import { ENTITY_TYPE } from '../constants';
import { EdgeSyncHandler } from './handlers/edge-sync.handler';
import { FoldersSyncHandler } from './handlers/folders-sync.handler';
import { NotesSyncHandler } from './handlers/notes-sync.handler';
import { SyncHandlerRegistryService } from './sync-handler-registry.service';

describe('SyncHandlerRegistryService', () => {
  let service: SyncHandlerRegistryService;

  let notesHandler: NotesSyncHandler;
  let folderHandler: FoldersSyncHandler;
  let edgeHandler: EdgeSyncHandler;

  beforeEach(() => {
    notesHandler = {
      entityType: ENTITY_TYPE.NOTE,
      apply: jest.fn(),
    };
    folderHandler = {
      entityType: ENTITY_TYPE.FOLDER,
      apply: jest.fn(),
    };
    edgeHandler = {
      entityType: ENTITY_TYPE.EDGE,
      apply: jest.fn(),
    };
    service = new SyncHandlerRegistryService(
      notesHandler,
      folderHandler,
      edgeHandler,
    );
  });

  it('Should return notesHandler', () => {
    const handler = service.get(ENTITY_TYPE.NOTE);
    expect(handler).toBe(notesHandler);
  });

  it('Should return folderHandler', () => {
    const handler = service.get(ENTITY_TYPE.FOLDER);
    expect(handler).toBe(folderHandler);
  });

  it('Should return edgeHandler', () => {
    const handler = service.get(ENTITY_TYPE.EDGE);
    expect(handler).toBe(edgeHandler);
  });

  it('Should throw error for unknown entity type', () => {
    const entityType = 'invalid' as ENTITY_TYPE;
    expect(() => service.get(entityType)).toThrow(
      `No handler found for entity type: ${entityType}`,
    );
  });
});
