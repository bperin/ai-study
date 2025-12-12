import { Module } from "@nestjs/common";
import { PdfSessionsController } from "./pdf-sessions.controller";
import { PdfSessionsService } from "./pdf-sessions.service";
import { PdfIngestService } from "../pdf/pdf-ingest.service";
import { AiStudyPlanService } from "../ai/ai-study-plan.service";
import { ToolCallingService } from "../ai/tool-calling.service";
import { InMemorySessionStore } from "./in-memory-session.store";
import { PrismaModule } from "../prisma/prisma.module";
import { AuthModule } from "../auth/auth.module";

@Module({
    imports: [PrismaModule, AuthModule],
    controllers: [PdfSessionsController],
    providers: [PdfSessionsService, PdfIngestService, AiStudyPlanService, ToolCallingService, InMemorySessionStore],
})
export class PdfSessionsModule {}
