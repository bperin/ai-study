import { IsInt, IsOptional, IsPositive, IsString } from 'class-validator';

export class QueryDocumentDto {
  @IsString()
  question!: string;

  @IsOptional()
  @IsInt()
  @IsPositive()
  topK?: number;
}
