import { IsString, IsOptional, IsNumber, IsBoolean } from 'class-validator';

export class StartSessionDto {
  @IsString()
  filename: string;

  @IsString()
  signedPdfUrl: string;

  @IsString()
  @IsOptional()
  testDescription?: string;

  @IsString()
  @IsOptional()
  difficulty?: string;

  @IsNumber()
  @IsOptional()
  cardTarget?: number;

  @IsBoolean()
  @IsOptional()
  includeImages?: boolean;
}
