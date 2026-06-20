import { Note } from '@prisma/client';

export type SearchNoteResult = Pick<
  Note,
  'id' | 'title' | 'updatedAt' | 'searchContent'
>;
