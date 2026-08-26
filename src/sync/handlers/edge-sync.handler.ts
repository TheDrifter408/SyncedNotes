import { Injectable } from '@nestjs/common';
import { SyncEntityHandler } from './sync-entity-handler';
import { ENTITY_TYPE, OPERATION } from '../../constants';
import { Prisma } from '@prisma/client';
import { ChangeRecordDto } from '../dto/change-record.dto';
import { BaseEdgeDto } from '@/edge/dto/create-edge.dto';

@Injectable()
export class EdgeSyncHandler implements SyncEntityHandler {
  readonly entityType = ENTITY_TYPE.EDGE;

  async apply(
    tx: Prisma.TransactionClient,
    userId: number,
    change: ChangeRecordDto,
    serverTime: Date,
  ): Promise<void> {
    switch (change.changeOperation) {
      case OPERATION.CREATE: {
        const existing = await tx.edge.findUnique({
          where: { id: change.entityId },
          select: {
            id: true,
          },
        });
        if (existing) {
          return;
        }
        const payload = JSON.parse(change.payload) as BaseEdgeDto;
        await tx.edge.create({
          data: {
            ...payload,
            userId,
            updatedAt: serverTime,
          },
        });
        return;
      }
      case OPERATION.UPDATE: {
        const payload = JSON.parse(change.payload) as BaseEdgeDto;
        await tx.edge.update({
          where: {
            id: payload.id,
          },
          data: {
            ...payload,
            userId,
            updatedAt: serverTime,
          },
        });
        return;
      }
      case OPERATION.DELETE: {
        const existing = await tx.edge.findUnique({
          where: { id: change.entityId },
          select: {
            id: true,
          },
        });
        if (!existing) {
          return;
        }
        const payload = JSON.parse(change.payload) as BaseEdgeDto;
        await tx.edge.delete({
          where: {
            id: payload.id,
          },
        });
        return;
      }
    }
  }
}
