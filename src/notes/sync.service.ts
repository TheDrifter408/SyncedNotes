import { Prisma } from '../prisma/prisma.service';
import { Injectable } from '@nestjs/common';
import { SyncNotesDto } from './dto/sync-notes.dto';
import { Note } from '@prisma/client';

@Injectable()
export class SyncService {
  constructor(private prisma: Prisma) {}

  async processSync(userId: number, incomingNotes: SyncNotesDto) {
    const clientChanges = incomingNotes.notes || [];

    const lastSyncedAt = incomingNotes.lastSyncedAt
      ? incomingNotes.lastSyncedAt
      : new Date(0);

    const serverTimeCheckpoint = new Date(0);

    const processedIds: string[] = [];
    const conflicts: string[] = [];

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
  }
}
