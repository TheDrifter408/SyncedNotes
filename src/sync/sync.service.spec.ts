import { Test } from '@nestjs/testing';
import { SyncService } from './sync.service';
import { Prisma } from '../prisma/prisma.service';
import { SyncHandlerRegistryService } from './sync-handler-registry.service';
import { Prisma as PrismaClient } from '@prisma/client';

describe('SyncService', () => {
  let service: SyncService;

  type TransactionCallback = (
    tx: PrismaClient.TransactionClient,
  ) => Promise<unknown>;

  const tx = {} as PrismaClient.TransactionClient;

  const prisma: {
    $transaction: jest.Mock<Promise<unknown>, [TransactionCallback]>;
  } = {
    $transaction: jest.fn<Promise<unknown>, [TransactionCallback]>(),
  };

  const registry = {
    get: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    prisma.$transaction.mockImplementation(async (callback) => callback(tx));

    const module = await Test.createTestingModule({
      providers: [
        SyncService,
        {
          provide: Prisma,
          useValue: prisma,
        },
        {
          provide: SyncHandlerRegistryService,
          useValue: registry,
        },
      ],
    }).compile();

    service = module.get(SyncService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
