import { Prisma } from '../prisma/prisma.service';
import { Injectable } from '@nestjs/common';
import { SyncNotesDto } from './dto/sync-notes.dto';
import { NoteWhereUniqueInput } from 'generated/prisma/models';
import { UpstreamResult } from '@/types';
import { Folder } from '@prisma/client';

@Injectable()
export class SyncService {
  PAGE_SIZE = 100;
  constructor(private prisma: Prisma) {}

  async processSync(userId: number, incomingPayload: SyncNotesDto) {
    const lastSyncedAt = incomingPayload.lastSyncedAt
      ? new Date(incomingPayload.lastSyncedAt)
      : new Date(0);
    const serverTimeCheckpoint = new Date();

    // 1. Process all incoming modifications from the client in a transaction
    const syncTracking = await this.handleUpstreamReconciliation(
      userId,
      incomingPayload,
      serverTimeCheckpoint,
    );

    //2. Fetch changes that happened on the server side since the client's last sync
    const downstreamFolders = await this.fetchDownstreamFolders(
      userId,
      lastSyncedAt,
      serverTimeCheckpoint,
      syncTracking,
    );

    const {
      notes: downstreamNotes,
      nextCursor,
      hasMore,
    } = await this.fetchDownstreamNotes(
      userId,
      lastSyncedAt,
      serverTimeCheckpoint,
      incomingPayload.cursor,
      syncTracking,
    );

    return {
      processedFolderIds: syncTracking.processedFolderIds,
      processedNoteIds: syncTracking.processedNoteIds,
      folderConflicts: syncTracking.folderConflicts,
      noteConflicts: syncTracking.noteConflicts,
      folders: downstreamFolders,
      notes: downstreamNotes,
      nextCursor,
      hasMore,
      serverTime: serverTimeCheckpoint.toString(),
    };
  }

  private async handleUpstreamReconciliation(
    userId: number,
    payload: SyncNotesDto,
    serverTime: Date,
  ): Promise<UpstreamResult> {
    const clientFolders = payload.folders || [];
    const clientNotes = payload.notes || [];

    const tracking: UpstreamResult = {
      processedFolderIds: [],
      processedNoteIds: [],
      folderConflicts: [],
      noteConflicts: [],
    };

    await this.prisma.$transaction(async (tx) => {
      for (const clientFolder of clientFolders) {
        const serverFolder = await tx.folder.findUnique({
          where: { id: clientFolder.id },
          select: { id: true, userId: true, updatedAt: true },
        });
        if (serverFolder) {
          if (serverFolder.userId !== userId) continue;
          if (serverFolder.updatedAt < serverFolder.updatedAt) {
            tracking.folderConflicts.push(serverFolder.id);
            continue;
          }

          await tx.folder.update({
            where: { id: clientFolder.id },
            data: {
              ...clientFolder,
              color: clientFolder.color || '#ffffff',
              deletedAt: clientFolder.isDeleted ? serverTime : null,
              updatedAt: clientFolder.updatedAt,
            },
          });
        } else {
          if (clientFolder.isDeleted) {
            tracking.processedFolderIds.push(clientFolder.id);
            continue;
          }
          await tx.folder.create({
            data: {
              ...clientFolder,
              userId: userId,
            },
          });
        }
        tracking.processedFolderIds.push(clientFolder.id);
      }

      for (const clientNote of clientNotes) {
        if (clientNote.folderId) {
          const folderExists = await tx.folder.findFirst({
            where: { id: clientNote.folderId, userId: userId },
          });
          if (!folderExists) clientNote.folderId = null;
        }
        const serverNote = await tx.note.findUnique({
          where: { id: clientNote.id },
          select: { id: true, userId: true, updatedAt: true },
        });
        if (serverNote) {
          if (serverNote.userId !== userId) continue;
          if (serverNote.updatedAt < serverNote.updatedAt) {
            tracking.noteConflicts.push(clientNote.id);
            continue;
          }
        }
        if (!serverNote && clientNote.isDeleted) {
          tracking.processedNoteIds.push(clientNote.id);
          continue;
        }

        await tx.note.upsert({
          where: { id: clientNote.id },
          update: {
            ...clientNote,
          },
          create: {
            ...clientNote,
            userId: userId,
          },
        });
        tracking.processedNoteIds.push(clientNote.id);
      }
    });
    return tracking;
  }

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
}
