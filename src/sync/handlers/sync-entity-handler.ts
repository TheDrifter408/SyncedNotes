import { ENTITY_TYPE } from '../../constants';
import { Prisma } from '@prisma/client';
import { ChangeRecordDto } from '../dto/change-record.dto';

export interface SyncEntityHandler {
  readonly entityType: ENTITY_TYPE;

  apply(
    tx: Prisma.TransactionClient,
    userId: number,
    change: ChangeRecordDto,
    serverTime: Date,
  ): Promise<void>;
}
