import { ENTITY_TYPE, OPERATION } from '../../constants';
import { SyncEntityHandler } from './sync-entity-handler';
import { Prisma } from '@prisma/client';
import { ChangeRecordDto } from '../dto/change-record.dto';
import { BaseFolderDto } from '@/folders/dto/base-folder.dto';
import { Injectable } from '@nestjs/common';

@Injectable()
export class FoldersSyncHandler implements SyncEntityHandler {
  readonly entityType = ENTITY_TYPE.FOLDER;

  async apply(
    tx: Prisma.TransactionClient,
    userId: number,
    change: ChangeRecordDto,
    serverTime: Date,
  ): Promise<void> {
    const payload = JSON.parse(change.payload) as BaseFolderDto;
    switch (change.changeOperation) {
      case OPERATION.CREATE: {
        const existing = await tx.folder.findUnique({
          where: { id: change.entityId },
          select: {
            id: true,
          },
        });
        if (existing) {
          return;
        }
        await tx.folder.create({
          data: {
            ...payload,
            userId,
            updatedAt: serverTime,
          },
        });
        return;
      }
      case OPERATION.UPDATE: {
        await tx.folder.update({
          where: { id: change.entityId },
          data: {
            ...payload,
            updatedAt: serverTime,
          },
        });
        return;
      }
      case OPERATION.DELETE: {
        const existing = await tx.folder.findUnique({
          where: { id: change.entityId },
          select: {
            id: true,
            isDeleted: true,
          },
        });
        if (!existing || existing.isDeleted) {
          return;
        }
        await tx.folder.update({
          where: { id: change.entityId },
          data: {
            isDeleted: true,
            updatedAt: serverTime,
          },
        });
        return;
      }
    }
  }
}
