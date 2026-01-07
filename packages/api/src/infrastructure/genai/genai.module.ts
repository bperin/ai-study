import { Module, Global } from '@nestjs/common';
import { GenAiService } from '../../shared/genai/genai.service';
import { PrismaModule } from '../prisma/prisma.module';

@Global()
@Module({
  imports: [PrismaModule],
  providers: [GenAiService],
  exports: [GenAiService],
})
export class GenAiModule {}
