import { Module, Global } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { GenAiService } from './genai.service';

@Global()
@Module({
  imports: [PrismaModule],
  providers: [GenAiService],
  exports: [GenAiService],
})
export class AiModule {}
