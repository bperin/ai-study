import { Body, Controller, Get, Param, Post, Req, UseGuards } from "@nestjs/common";
import { Request } from "express";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { PdfSessionsService } from "./pdf-sessions.service";
import { StartSessionDto } from "./dto/start-session.dto";
import { StudySessionSummary } from "./interfaces/study-session.interface";

@Controller("study-sessions")
export class PdfSessionsController {
    constructor(private readonly pdfSessionsService: PdfSessionsService) {}

    @UseGuards(JwtAuthGuard)
    @Post()
    async createSession(@Req() request: Request, @Body() dto: StartSessionDto): Promise<StudySessionSummary> {
        const authorization = request.headers["authorization"] || "";
        const token = authorization.replace("Bearer ", "");

        return this.pdfSessionsService.startSession({
            userId: (request as any).user.userId,
            token,
            payload: dto,
        });
    }

    @UseGuards(JwtAuthGuard)
    @Get(":id")
    getSession(@Param("id") id: string): StudySessionSummary {
        return this.pdfSessionsService.getSession(id);
    }
}
