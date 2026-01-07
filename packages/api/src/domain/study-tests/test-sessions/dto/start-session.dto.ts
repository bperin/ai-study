import { IsInt, IsNotEmpty, IsOptional, IsString, IsUrl, Max, Min } from 'class-validator';

export class StartSessionDto {
  @IsUrl()
  signedPdfUrl: string;

  @IsString()
  @IsNotEmpty()
  filename: string;

  @IsString()
  @IsNotEmpty()
  testDescription: string;

  @IsOptional()
  @IsString()
  difficulty?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(50)
  cardTarget?: number;
}
