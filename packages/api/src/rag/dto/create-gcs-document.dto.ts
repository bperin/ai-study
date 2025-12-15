import { IsOptional, IsString } from 'class-validator';

export class CreateGcsDocumentDto {
  @IsOptional()
  @IsString()
  title?: string;

  @IsString()
  gcsUri!: string;
}
