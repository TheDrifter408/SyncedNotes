import { Type } from 'class-transformer';
import { IsArray, IsDate, IsOptional, ValidateNested } from 'class-validator';
import { BaseNoteDto } from './base-note.dto';

export class SyncNotesDto {
  @IsDate()
  @IsOptional()
  @Type(() => Date)
  lastSyncedAt?: Date;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => BaseNoteDto)
  notes!: BaseNoteDto[];
}
