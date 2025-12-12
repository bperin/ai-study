import { IsNotEmpty, IsString } from 'class-validator';

export class ConfirmUploadDto {
    @IsString()
    @IsNotEmpty()
    filePath!: string;

    @IsString()
    @IsNotEmpty()
    fileName!: string;
}
