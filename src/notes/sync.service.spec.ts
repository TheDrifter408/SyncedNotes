import { Prisma } from '../prisma/prisma.service';
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

  it('Should update the note if incoming updatedAt is newer', async () => {
    const userId = 1;

    const existingNote = {
      id: 'note-1',
      updatedAt: new Date('2023-01-01T10:00:00Z'),
      userId: 1,
    };

    const incomingNote = {
      id: 'note-1',
      title: 'new title',
      content: 'new content',
      updatedAt: new Date('2023-01-01T11:00:00Z'),
      isDeleted: false,
      folderId: null,
      searchContent: '',
    };

    mockPrisma.note.findUnique.mockResolvedValue(existingNote);
    mockPrisma.note.upsert.mockResolvedValue({ ...incomingNote, userId });

    const result = await service.processSync(userId, { notes: [incomingNote] });

    expect(mockPrisma.note.upsert).toHaveBeenCalled();
    expect(result?.notes[0]?.title).toBe('new title');

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

    const incomingNote = {
      id: 'note-1',
      title: 'client title',
      content: 'old content',
      updatedAt: new Date('2023-01-01T11:00:00Z'),
      isDeleted: false,
      folderId: null,
      searchContent: '',
    };

    mockPrisma.note.findUnique.mockResolvedValue(existingNote);
    const result = await service.processSync(userId, { notes: [incomingNote] });

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

    const incomingNote = {
      id: 'note-1',
      title: 'some new title',
      content: 'content 2',
      updatedAt: new Date(),
      isDeleted: false,
      folderId: null,
      searchContent: '',
    };

    mockPrisma.note.findUnique.mockResolvedValue(existingNote);
    const result = await service.processSync(userId, { notes: [incomingNote] });

    expect(mockPrisma.note.upsert).not.toHaveBeenCalled();
    expect(result).toHaveLength(0);
  });
});
