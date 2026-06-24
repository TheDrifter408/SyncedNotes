import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsDate,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
} from 'class-validator';

export class BaseFolderDto {
  @IsUUID()
  @IsNotEmpty()
  id!: string; // This will be generated on the client side

  @IsString()
  @IsNotEmpty()
  name!: string;

  @IsOptional()
  @IsString()
  color!: string;

  @IsDate()
  @Type(() => Date)
  updatedAt!: Date;

  @IsBoolean()
  isDeleted!: boolean;

  @IsDate()
  @Type(() => Date)
  deletedAt: Date;
}
