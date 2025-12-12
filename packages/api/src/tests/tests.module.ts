import { Module } from "@nestjs/common";
import { TestsService } from "./tests.service";
import { TestsController } from "./tests.controller";
import { LeaderboardService } from "./leaderboard.service";
import { PrismaModule } from "../prisma/prisma.module";

@Module({
    imports: [PrismaModule],
    controllers: [TestsController],
    providers: [TestsService, LeaderboardService],
})
export class TestsModule { }
