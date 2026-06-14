import {
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { CreateNoteDto } from './dto/create-note.dto';
import { UpdateNoteDto } from './dto/update-note.dto';
import { Prisma } from '../prisma/prisma.service';
import { Note } from '@prisma/client';
import { SearchNoteResult } from '@/types';

@Injectable()
export class NotesService {
  constructor(private prisma: Prisma) {}

  async create(userId: number, createNoteDto: CreateNoteDto) {
    const note = await this.prisma.note.create({
      data: {
        ...createNoteDto,
        userId,
      },
    });

    if (!note) {
      throw new InternalServerErrorException();
    }

    return note;
  }

  async findAll(userId: number) {
    const notes = await this.prisma.note.findMany({
      where: {
        userId,
      },
      orderBy: { updatedAt: 'desc' },
    });
    return notes;
  }

  async findOne(userId: number, id: string) {
    const note = await this.prisma.note.findUnique({
      where: {
        id,
        userId,
      },
    });

    if (!note) {
      throw new NotFoundException(`Note with ${id} not found`);
    }

    return note;
  }

  async update(userId: number, id: string, updateNoteDto: UpdateNoteDto) {
    const updated = await this.prisma.note.update({
      where: {
        id,
        userId,
      },
      data: {
        ...updateNoteDto,
        version: { increment: 1 },
      },
    });

    if (!updated) {
      throw new NotFoundException(`Note with ${id} not found`);
    }

    return updated;
  }

  async remove(userId: number, id: string) {
    const deleted = await this.prisma.note.delete({
      where: {
        id,
        userId,
      },
    });

    if (!deleted) {
      throw new NotFoundException(`Note not found or not authorized`);
    }

    return deleted;
  }

  async searchNotes(
    userId: number,
    stringQuery: string,
  ): Promise<SearchNoteResult[]> {
    if (!stringQuery.trim()) return [];

    const result = await this.prisma.$queryRaw<SearchNoteResult[]>`
      SELECT id, title, "updatedAt",
      ts_headline(
        'english',
        "searchContent",
        websearch_to_tsquery('english', ${stringQuery}),
        'StartSel=<mark>, StopSel=</mark>, MaxWords=30, FragmentDelimiter="..." '
      ) as snippet
      FROM "Note"
      WHERE "userId" = ${userId}
        AND "isDeleted" = false
        AND to_tsvector(
          'english',
          coalesce("title", '') || ' ' || coalesce("searchContent", '')
          ) @@ plainto_tsquery('english', ${stringQuery})
        ORDER BY ts_rank(
          to_tsvector(
          'english',
          coalesce("title", '') || ' ' || coalesce("searchContent", '')),
          plainto_tsquery('english', ${stringQuery})) DESC
        LIMIT 20;
      `;
    return result;
  }
}
