import { Prisma } from '../prisma/prisma.service';
import { ChangeRecordDto } from './dto/sync-changes.dto';
import { SyncService } from './sync.service';
import { Test, TestingModule } from '@nestjs/testing';

describe('SyncService', () => {
  let service: SyncService;
  let prisma: Prisma;

  const mockPrisma = {
    $transaction: jest.fn((callback: (prisma: Prisma) => void) =>
      callback(prisma),
    ),
    note: {
      findUnique: jest.fn(),
      upsert: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SyncService,
        {
          provide: Prisma,
          useValue: prisma,
        },
      ],
    }).compile();

    service = module.get<SyncService>(SyncService);
    prisma = module.get<Prisma>(Prisma);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('Should return the server verson if the server version is newer', async () => {
    const userId = 1;
    const existingNote = {
      id: 'note-1',
      title: 'Server title',
      content: 'new content',
      updatedAt: new Date('2023-01-01T12:00:00Z'),
      userId: 1,
    };

    const payloadNote = JSON.stringify({
      id: 'note-1',
      title: 'client title',
      content: 'old content',
      updatedAt: new Date('2023-01-01T11:00:00Z'),
      isDeleted: false,
      folderId: null,
      searchContent: '',
    });

    const incomingNote: ChangeRecordDto = {
      id: 1,
      changeOperation: 'create',
      entityId: 'note-1',
      changeEntityType: 'note',
      payload: payloadNote,
      timestamp: new Date().toISOString(),
    };

    mockPrisma.note.findUnique.mockResolvedValue(existingNote);
    const result = await service.processSyncChanges(userId, {
      changes: [incomingNote],
    });

    expect(mockPrisma.note.upsert).not.toHaveBeenCalled();
    expect(result?.notes[0]?.title).toBe('Server title');
  });

  it('Should skip notes that do not belong to the user', async () => {
    const userId = 1;
    const existingNote = {
      id: 'note-1',
      title: 'some title',
      userId: 999,
      updatedAt: new Date(),
    };

    const incomingPayload = JSON.stringify({
      id: 'note-1',
      title: 'some new title',
      content: 'content 2',
      updatedAt: new Date(),
      isDeleted: false,
      folderId: null,
      searchContent: '',
    });

    const incomingNote: ChangeRecordDto = {
      id: 1,
      changeOperation: 'update',
      entityId: 'note-1',
      changeEntityType: 'note',
      payload: incomingPayload,
      timestamp: new Date().toISOString(),
    };

    mockPrisma.note.findUnique.mockResolvedValue(existingNote);
    const result = await service.processSyncChanges(userId, {
      changes: [incomingNote],
    });

    expect(mockPrisma.note.upsert).not.toHaveBeenCalled();
    expect(result).toHaveLength(0);
  });
});
