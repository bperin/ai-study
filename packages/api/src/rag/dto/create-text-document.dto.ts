import { IsOptional, IsString } from 'class-validator';

export class CreateTextDocumentDto {
  @IsOptional()
  @IsString()
  title?: string;

  @IsString()
  text!: string;
}
