import { IsString } from 'class-validator';

export class SearchNotesDto {
  @IsString()
  query: string;
}
