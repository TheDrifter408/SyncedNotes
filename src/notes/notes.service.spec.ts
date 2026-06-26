import { Test, TestingModule } from '@nestjs/testing';
import { NotesService } from './notes.service';
import { NotFoundException } from '@nestjs/common';
import { Prisma } from '../prisma/prisma.service';
import { SyncService } from './sync.service';

describe('NotesService', () => {
  let service: NotesService;

  // 1. Create a Mock Prisma Object
  const mockPrisma = {
    note: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      upsert: jest.fn(),
    },
    $transaction: jest.fn((callback) => callback(mockPrisma)), // Mocking transactions
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NotesService,
        SyncService,
        { provide: Prisma, useValue: mockPrisma }, // Inject the mock
      ],
    }).compile();

    service = module.get<NotesService>(NotesService);
    prisma = module.get<Prisma>(Prisma);
  });

  afterEach(() => {
    jest.clearAllMocks(); // Clean up between tests
  });

  describe('findOne', () => {
    it('should return a note if it exists', async () => {
      const mockNote = { id: '1', title: 'Test Note', userId: 123 };
      mockPrisma.note.findUnique.mockResolvedValue(mockNote);

      const result = await service.findOne(123, '1');

      expect(result).toEqual(mockNote);
      expect(mockPrisma.note.findUnique).toHaveBeenCalledWith({
        where: { id: '1', userId: 123 },
      });
    });

    it('should throw NotFoundException if note does not exist', async () => {
      mockPrisma.note.findUnique.mockResolvedValue(null);

      await expect(service.findOne(123, '999')).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});
