import { Type } from 'class-transformer';
import {
  IsDate,
  IsNotEmpty,
  IsString,
  IsUUID,
  IsBoolean,
  IsOptional,
} from 'class-validator';

export class BaseNoteDto {
  @IsUUID()
  @IsNotEmpty()
  id!: string; // This will be generated on the client side

  @IsString()
  @IsNotEmpty()
  title!: string;

  @IsOptional()
  @IsString()
  folderId!: string | null;

  @IsString()
  @IsNotEmpty()
  content!: string; // To Map seamlessly to Prisma's native JSON typing

  @IsString()
  searchContent!: string;

  @IsDate()
  @Type(() => Date)
  updatedAt!: Date;

  @IsBoolean()
  isDeleted!: boolean;
}
