import { Prisma } from '@/prisma/prisma.service';
import { Injectable } from '@nestjs/common';
import { SyncHandlerRegistryService } from './sync-handler-registry.service';
import { SyncChangesDto } from './dto/sync-changes.dto';

@Injectable()
export class SyncService {
  constructor(
    private prisma: Prisma,
    private readonly syncHandlerRegistry: SyncHandlerRegistryService,
  ) {}

  async sync(userId: number, dto: SyncChangesDto) {
    const serverTime = new Date();

    await this.prisma.$transaction(async (tx) => {
      for (const change of dto.changes) {
        const handler = this.syncHandlerRegistry.get(change.changeEntityType);
        await handler.apply(tx, userId, change, serverTime);
      }
    });

    return {
      success: true,
    };
  }
}
