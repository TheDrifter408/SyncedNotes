import { ENTITY_TYPE, OPERATION } from '../../constants';
import {
  IsIn,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
} from 'class-validator';

export class ChangeRecordDto {
  @IsNumber()
  @IsOptional()
  id?: number;

  @IsString()
  @IsIn([Object.values(OPERATION)])
  changeOperation!: OPERATION;

  @IsString()
  @IsIn(Object.values(ENTITY_TYPE))
  changeEntityType!: ENTITY_TYPE;

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
