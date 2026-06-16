import { Type } from 'class-transformer';
import {
  IsDate,
  IsNotEmpty,
  IsString,
  IsUUID,
  IsBoolean,
  IsObject,
} from 'class-validator';
import { Prisma } from 'generated/prisma/browser';

export class BaseNoteDto {
  @IsUUID()
  @IsNotEmpty()
  id!: string; // This will be generated on the client side

  @IsString()
  @IsNotEmpty()
  title!: string;

  @IsObject()
  @IsNotEmpty()
  content!: Prisma.InputJsonValue; // To Map seamlessly to Prisma's native JSON typing

  @IsString()
  searchContent!: string;

  @IsDate()
  @Type(() => Date)
  updatedAt!: Date;

  @IsBoolean()
  isDeleted!: boolean;
}
