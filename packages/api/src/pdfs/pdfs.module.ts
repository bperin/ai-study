import { Module } from '@nestjs/common';
import { PdfsController } from './pdfs.controller';
import { PdfsService } from './pdfs.service';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
    imports: [PrismaModule],
    controllers: [PdfsController],
    providers: [PdfsService],
    exports: [PdfsService],
})
export class PdfsModule { }
