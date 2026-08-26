import { Injectable } from '@nestjs/common';
import { SyncEntityHandler } from './sync-entity-handler';
import { ENTITY_TYPE, OPERATION } from '../../constants';
import { Prisma } from '@prisma/client';
import { ChangeRecordDto } from '@/notes/dto/sync-changes.dto';
import { BaseNoteDto } from '@/notes/dto/base-note.dto';

@Injectable()
export class NotesSyncHandler implements SyncEntityHandler {
  readonly entityType = ENTITY_TYPE.NOTE;

  async apply(
    tx: Prisma.TransactionClient,
    userId: number,
    change: ChangeRecordDto,
    serverTime: Date,
  ): Promise<void> {
    switch (change.changeOperation) {
      case OPERATION.CREATE: {
        const payload = JSON.parse(change.payload) as BaseNoteDto;
        const existing = await tx.note.findUnique({
          where: { id: change.entityId },
          select: {
            id: true,
          },
        });
        if (existing) {
          return;
        }
        await tx.note.create({
          data: {
            ...payload,
            userId,
          },
        });
        return;
      }
      case OPERATION.UPDATE: {
        const payload = JSON.parse(change.payload) as BaseNoteDto;
        await tx.note.update({
          where: { id: change.entityId },
          data: {
            ...payload,
            updatedAt: serverTime.toISOString(),
          },
        });
        return;
      }
      case OPERATION.DELETE: {
        const existing = await tx.note.findUnique({
          where: { id: change.entityId },
          select: {
            id: true,
            isDeleted: true,
          },
        });
        if (!existing || existing.isDeleted) {
          return;
        }
        await tx.note.update({
          where: { id: change.entityId },
          data: {
            isDeleted: true,
            updatedAt: serverTime.toISOString(),
          },
        });
        return;
      }
    }
  }
}
