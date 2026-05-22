import { Prisma } from '../prisma/prisma.service';
import { Injectable } from '@nestjs/common';
import { SyncNotesDto } from './dto/sync-notes.dto';
import { NoteWhereInput, NoteWhereUniqueInput } from 'generated/prisma/models';

@Injectable()
export class SyncService {
  constructor(private prisma: Prisma) {}

  async processSync(userId: number, incomingNotes: SyncNotesDto) {
    const clientChanges = incomingNotes.notes || [];

    const lastSyncedAt = incomingNotes.lastSyncedAt
      ? incomingNotes.lastSyncedAt
      : new Date(0);

    const serverTimeCheckpoint = new Date(0);

    const PAGE_SIZE = 100;

    const processedIds: string[] = [];
    const conflicts: string[] = [];

    // Phase 1: Upstream reconciliation Loop
    await this.prisma.$transaction(async (tx) => {
      for (const clientNote of clientChanges) {
        const serverNote = await tx.note.findUnique({
          where: {
            id: clientNote.id,
          },
          select: {
            id: true,
            userId: true,
            updatedAt: true,
          },
        });
        if (serverNote) {
          if (serverNote.userId !== userId) continue;

          // Last Write Wins execution based on comparing LastUpdated timestamps
          if (clientNote.updatedAt < serverNote.updatedAt) {
            conflicts.push(clientNote.id);
            continue;
          }

          await tx.note.update({
            where: {
              id: clientNote.id,
            },
            data: {
              title: clientNote.title,
              version: 1,
              content: clientNote.content,
              isDeleted: clientNote.isDeleted,
              updatedAt: clientNote.updatedAt,
            },
          });
        } else {
          if (clientNote.isDeleted) {
            processedIds.push(clientNote.id);
            continue;
          }
          await tx.note.create({
            data: {
              id: clientNote.id,
              userId: userId,
              title: clientNote.title,
              version: 1,
              content: clientNote.content,
              isDeleted: clientNote.isDeleted,
              updatedAt: clientNote.updatedAt,
            },
          });
          processedIds.push(clientNote.id);
        }
      }
    });

    // Phase 2: Cursor based downstream fetching
    const baseWhereClause: NoteWhereInput = {
      userId: userId,
      updatedAt: {
        gt: lastSyncedAt,
        lte: serverTimeCheckpoint,
      },
      id: {
        notIn: processedIds.concat(conflicts),
      },
    };

    // Decode incoming pagination token if provided by client
    let cursorCondition: NoteWhereUniqueInput | undefined = undefined;
    if (incomingNotes.cursor) {
      try {
        const decodedJson = JSON.parse(
          Buffer.from(incomingNotes.cursor, 'base64').toString('utf-8'),
        ) as { id: string; updatedAt: string };
        cursorCondition = { id: decodedJson.id };
      } catch {
        cursorCondition = undefined;
      }
    }
    const downstreamChanges = await this.prisma.note.findMany({
      where: baseWhereClause,
      take: PAGE_SIZE + 1,
      cursor: cursorCondition,
      skip: cursorCondition ? 1 : 0,
      orderBy: [{ updatedAt: 'asc' }, { id: 'asc' }],
    });

    const serverWonConflicts = await this.prisma.note.findMany({
      where: { id: { in: conflicts } },
    });

    const combinedChanges = [...downstreamChanges, ...serverWonConflicts];
    const hasMore = combinedChanges.length > PAGE_SIZE;

    // Truncate the current array snapshot back to the explicit PAGE_SIZE limit
    const targetedChanges = combinedChanges.slice(0, PAGE_SIZE);
    let nextCursor: string | null = null;
    if (hasMore && targetedChanges.length > 0) {
      const lastNoteInBatch = targetedChanges[targetedChanges.length - 1];
      const cursorPayload = {
        id: lastNoteInBatch.id,
        updatedAt: lastNoteInBatch.updatedAt.toISOString(),
      };

      nextCursor = Buffer.from(JSON.stringify(cursorPayload)).toString(
        'base64',
      );
    }
    return {
      processedIds,
      changes: targetedChanges,
      nextCursor,
      hasMore,
      serverTime: serverTimeCheckpoint.toISOString(),
    };
  }
}
