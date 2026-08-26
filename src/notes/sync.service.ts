import { Prisma } from '../prisma/prisma.service';
import { Injectable, Logger } from '@nestjs/common';
import { SyncChangesDto, ChangeRecordDto } from './dto/sync-changes.dto';
import { NoteWhereUniqueInput } from 'generated/prisma/models';
import { UpstreamResult } from '@/types';
import { Folder, Prisma as PrismaClient } from '@prisma/client';
import { CreateFolderDto } from '@/folders/dto/create-folder.dto';
import { plainToInstance } from 'class-transformer';
import { UpdateFolderDto } from '@/folders/dto/update-folder.dto';
import { BaseFolderDto } from '@/folders/dto/base-folder.dto';
import { BaseNoteDto } from './dto/base-note.dto';
import { CreateNoteDto } from './dto/create-note.dto';
import { UpdateNoteDto } from './dto/update-note.dto';
import { BaseEdgeDto } from '@/edge/dto/create-edge.dto';

@Injectable()
export class SyncService {
  PAGE_SIZE = 100;
  private readonly logger = new Logger(SyncService.name);

  constructor(private prisma: Prisma) {}

  private async fetchDownstreamFolders(
    userId: number,
    lastSyncedAt: Date,
    serverTime: Date,
    tracking: UpstreamResult,
  ): Promise<Folder[]> {
    const downstreamFolders: Folder[] = await this.prisma.folder.findMany({
      where: {
        userId: userId,
        updatedAt: { gt: lastSyncedAt, lte: serverTime },
        id: {
          notIn: tracking.processedFolderIds.concat(tracking.folderConflicts),
        },
      },
    });
    const serverWonFolderConflicts: Folder[] =
      await this.prisma.folder.findMany({
        where: { id: { in: tracking.folderConflicts } },
      });

    return [...downstreamFolders, ...serverWonFolderConflicts];
  }

  private async fetchDownstreamNotes(
    userId: number,
    lastSyncedAt: Date,
    serverTime: Date,
    rawCursor: string | undefined,
    tracking: UpstreamResult,
  ) {
    let cursorCondition: NoteWhereUniqueInput | undefined = undefined;
    if (rawCursor) {
      try {
        const decodedJSON = JSON.parse(
          Buffer.from(rawCursor, 'base64').toString('utf-8'),
        ) as { id: string; updatedAt: string };
        cursorCondition = { id: decodedJSON.id };
      } catch {
        cursorCondition = undefined;
      }
    }
    const downstreamNotes = await this.prisma.note.findMany({
      where: {
        userId: userId,
        updatedAt: {
          gt: lastSyncedAt,
          lte: serverTime,
        },
        id: { notIn: tracking.processedNoteIds.concat(tracking.noteConflicts) },
      },
      take: this.PAGE_SIZE + 1,
      cursor: cursorCondition,
      skip: cursorCondition ? 1 : 0,
      orderBy: [{ updatedAt: 'asc' }, { id: 'asc' }],
    });

    const serverWonNoteConflicts = await this.prisma.note.findMany({
      where: {
        id: {
          in: tracking.noteConflicts,
        },
      },
    });
    const combinedNotes = [...downstreamNotes, ...serverWonNoteConflicts];
    const hasMore = combinedNotes.length > this.PAGE_SIZE;
    const targetedNotes = combinedNotes.slice(0, this.PAGE_SIZE);

    let nextCursor: string | null = null;
    if (hasMore && targetedNotes.length > 0) {
      const lastNoteInBatch = targetedNotes[targetedNotes.length - 1];
      const cursorPayload = {
        id: lastNoteInBatch.id,
        updatedAt: lastNoteInBatch.updatedAt.toISOString(),
      };
      nextCursor = Buffer.from(JSON.stringify(cursorPayload)).toString(
        'base64',
      );
    }
    return { notes: targetedNotes, nextCursor, hasMore };
  }

  // Change‑record based sync
  async processSyncChanges(userId: number, dto: SyncChangesDto) {
    const lastSyncedAt = dto.lastSyncedAt ?? new Date(0);
    const serverTime = new Date();
    const processedChangeIds: number[] = [];

    // Apply all incoming change records in a single transaction
    await this.prisma.$transaction(async (tx) => {
      for (const change of dto.changes) {
        try {
          const payload = JSON.parse(change.payload) as unknown;

          if (change.changeEntityType === 'folder') {
            let folderDto: BaseFolderDto | null = null;
            switch (change.changeOperation) {
              case 'create':
                folderDto = plainToInstance(CreateFolderDto, payload);
                break;
              case 'update':
                folderDto = plainToInstance(UpdateFolderDto, payload);
                break;
              default:
                folderDto = null;
            }
            await this.applyFolderChangeRecord(
              tx,
              userId,
              change,
              folderDto,
              serverTime,
            );
          } else if (change.changeEntityType === 'note') {
            let noteDto: BaseNoteDto | null = null;
            switch (change.changeOperation) {
              case 'create':
                noteDto = plainToInstance(CreateNoteDto, payload);
                break;
              case 'update':
                noteDto = plainToInstance(UpdateNoteDto, payload);
                break;
              default:
                noteDto = null;
            }
            await this.applyNoteChangeRecord(
              tx,
              userId,
              change,
              noteDto,
              serverTime,
            );
          } else if (change.changeEntityType === 'edge') {
            let edgeDto: BaseEdgeDto | null = null;
            switch (change.changeOperation) {
              case 'create': {
                edgeDto = plainToInstance(BaseEdgeDto, payload);
                break;
              }
              case 'update': {
                edgeDto = plainToInstance(BaseEdgeDto, payload);
                break;
              }
            }
            await this.applyEdgeChangeRecord(
              tx,
              userId,
              change,
              edgeDto,
              serverTime,
            );
          }

          if (change.id !== undefined) {
            processedChangeIds.push(change.id);
          }
        } catch (err) {
          this.logger.error(
            `Failed to apply change record ${change.id} (${change.changeEntityType}/${change.changeOperation}/${change.entityId})`,
            err,
          );
        }
      }
    });

    // No upstream reconciliation needed — change records are applied directly.
    // No entities were "processed" in the old sense (they were applied, not skipped).
    const emptyTracking: UpstreamResult = {
      processedFolderIds: [],
      processedNoteIds: [],
      folderConflicts: [],
      noteConflicts: [],
    };

    // Fetch downstream changes (same logic as the existing sync)
    const downstreamFolders = await this.fetchDownstreamFolders(
      userId,
      lastSyncedAt,
      serverTime,
      emptyTracking,
    );

    const {
      notes: downstreamNotes,
      nextCursor,
      hasMore,
    } = await this.fetchDownstreamNotes(
      userId,
      lastSyncedAt,
      serverTime,
      dto.cursor,
      emptyTracking,
    );

    return {
      processedChangeIds,
      folders: downstreamFolders,
      notes: downstreamNotes,
      nextCursor,
      hasMore,
      serverTime: serverTime.toISOString(),
    };
  }

  // -------------------------------------------------------------------------
  // Helpers — apply a single ChangeRecord to the database
  // -------------------------------------------------------------------------

  private async applyNoteChangeRecord(
    tx: PrismaClient.TransactionClient,
    userId: number,
    change: ChangeRecordDto,
    payload: BaseNoteDto | null,
    serverTime: Date,
  ) {
    switch (change.changeOperation) {
      case 'create': {
        await tx.note.create({
          data: {
            ...payload,
            id: change.entityId,
            userId,
          } as PrismaClient.NoteUncheckedCreateInput,
        });
        break;
      }
      case 'update': {
        const existing = await tx.note.findUnique({
          where: { id: change.entityId },
          select: { id: true, userId: true },
        });
        if (!existing || existing.userId !== userId) return;

        await tx.note.update({
          where: { id: change.entityId },
          data: {
            ...payload,
            userId,
          } as PrismaClient.NoteUncheckedUpdateInput,
        });
        break;
      }
      case 'delete': {
        const existing = await tx.note.findUnique({
          where: { id: change.entityId },
          select: { id: true, userId: true },
        });
        if (!existing || existing.userId !== userId) return;

        await tx.note.update({
          where: { id: change.entityId },
          data: { isDeleted: true, deletedAt: serverTime },
        });
        break;
      }
    }
  }

  private async applyFolderChangeRecord(
    tx: PrismaClient.TransactionClient,
    userId: number,
    change: ChangeRecordDto,
    payload: BaseFolderDto | null,
    serverTime: Date,
  ) {
    switch (change.changeOperation) {
      case 'create': {
        await tx.folder.create({
          data: {
            ...payload,
            id: change.entityId,
            userId,
          } as PrismaClient.FolderUncheckedCreateInput,
        });
        break;
      }
      case 'update': {
        const existing = await tx.folder.findUnique({
          where: { id: change.entityId },
          select: { id: true, userId: true },
        });
        if (!existing || existing.userId !== userId) return;

        await tx.folder.update({
          where: { id: change.entityId },
          data: {
            ...payload,
            userId,
          } as PrismaClient.FolderUncheckedUpdateInput,
        });
        break;
      }
      case 'delete': {
        const existing = await tx.folder.findUnique({
          where: { id: change.entityId },
          select: { id: true, userId: true },
        });
        if (!existing || existing.userId !== userId) return;

        await tx.folder.update({
          where: { id: change.entityId },
          data: { isDeleted: true, deletedAt: serverTime },
        });
        break;
      }
    }
  }

  private async applyEdgeChangeRecord(
    tx: PrismaClient.TransactionClient,
    userId: number,
    change: ChangeRecordDto,
    payload: BaseEdgeDto | null,
    serverTime: Date,
  ) {
    switch (change.changeOperation) {
      case 'create': {
        await tx.edge.create({
          data: {
            ...payload,
            id: change.entityId,
            userId,
          } as PrismaClient.EdgeUncheckedCreateInput,
        });
        break;
      }
      case 'update': {
        const existing = await tx.edge.findUnique({
          where: { id: change.entityId },
          select: { id: true, userId: true },
        });

        if (!existing || existing.userId !== userId) return;

        await tx.edge.update({
          where: { id: change.entityId },
          data: {
            ...payload,
            userId,
          } as PrismaClient.EdgeUncheckedUpdateInput,
        });
        break;
      }
      case 'delete': {
        const existing = await tx.edge.findUnique({
          where: { id: change.entityId },
          select: { id: true, userId: true },
        });
        if (!existing || existing.userId !== userId) return;

        await tx.edge.update({
          where: { id: change.entityId },
          data: {
            ...payload,
            isDeleted: true,
            deletedAt: serverTime,
          } as PrismaClient.EdgeUncheckedUpdateInput,
        });
        break;
      }
    }
  }
}
