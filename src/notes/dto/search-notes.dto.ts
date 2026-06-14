import { IsString } from 'class-validator';

export class SearchNotesDto {
  @IsString()
  stringQuery: string;
}
