import { Type } from 'class-transformer';
import {
  IsArray,
  IsDate,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';
import { ChangeRecordDto } from './change-record.dto';

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
