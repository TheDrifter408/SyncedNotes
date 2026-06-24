import { Type } from 'class-transformer';
import {
  IsArray,
  IsDate,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';
import { BaseNoteDto } from './base-note.dto';
import { BaseFolderDto } from '@/folders/dto/base-folder.dto';

export class SyncNotesDto {
  @IsDate()
  @IsOptional()
  @Type(() => Date)
  lastSyncedAt?: Date;

  @IsString()
  @IsOptional()
  cursor?: string;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => BaseFolderDto)
  folders?: BaseFolderDto[];

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => BaseNoteDto)
  notes!: BaseNoteDto[];
}
