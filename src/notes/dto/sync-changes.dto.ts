import { Type } from 'class-transformer';
import {
  IsArray,
  IsDate,
  IsIn,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';

export class ChangeRecordDto {
  @IsNumber()
  @IsOptional()
  id?: number;

  @IsString()
  @IsIn(['create', 'update', 'delete'])
  changeOperation!: 'create' | 'update' | 'delete';

  @IsString()
  @IsIn(['folder', 'note', 'edge'])
  changeEntityType!: 'folder' | 'note' | 'edge';

  @IsString()
  @IsNotEmpty()
  entityId!: string;

  @IsString()
  @IsNotEmpty()
  payload!: string;

  @IsString()
  @IsNotEmpty()
  timestamp!: string;
}

export class SyncChangesDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ChangeRecordDto)
  changes!: ChangeRecordDto[];

  @IsDate()
  @IsOptional()
  @Type(() => Date)
  lastSyncedAt?: Date;

  @IsString()
  @IsOptional()
  cursor?: string;
}
