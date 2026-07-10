import { PartialType } from '@nestjs/mapped-types';
import { BaseNoteDto } from './base-note.dto';
import {
  IsBoolean,
  IsDate,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
} from 'class-validator';
import { Type } from 'class-transformer';

export class UpdateNoteDto extends PartialType(BaseNoteDto) {
  @IsUUID()
  @IsNotEmpty()
  id!: string;

  @IsString()
  title!: string;

  @IsString()
  searchContent!: string;

  @IsString()
  content!: string;

  @IsOptional()
  @IsString()
  folderId!: string | null;

  @IsDate()
  @Type(() => Date)
  updatedAt!: Date;

  @IsBoolean()
  isDeleted!: boolean;
}
