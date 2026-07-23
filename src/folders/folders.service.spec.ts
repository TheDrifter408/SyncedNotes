import { Test, TestingModule } from '@nestjs/testing';
import { FoldersService } from './folders.service';
import { Prisma } from '@/prisma/prisma.service';

describe('FoldersService', () => {
  let service: FoldersService;
  let prisma: Prisma;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [FoldersService],
    }).compile();

    service = module.get<FoldersService>(FoldersService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
