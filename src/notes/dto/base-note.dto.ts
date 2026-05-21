import { Type } from 'class-transformer';
import {
  IsDate,
  IsNotEmpty,
  IsString,
  IsUUID,
  IsBoolean,
  IsObject,
} from 'class-validator';

export class BaseNoteDto {
  @IsUUID()
  @IsNotEmpty()
  id!: string; // This will be generated on the client side

  @IsString()
  @IsNotEmpty()
  title!: string;

  @IsObject()
  @IsNotEmpty()
  content!: any; // To Map seamlessly to Prisma's native JSON typing

  @IsDate()
  @Type(() => Date)
  updatedAt!: Date;

  @IsBoolean()
  isDeleted!: boolean;
}
