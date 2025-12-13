import { Module } from "@nestjs/common";
import { TestsService } from "./tests.service";
import { TestsController } from "./tests.controller";
import { TestTakingController } from "./test-taking.controller";
import { TestTakingService } from "./test-taking.service";
import { LeaderboardService } from "./leaderboard.service";
import { PrismaModule } from "../prisma/prisma.module";

@Module({
    imports: [PrismaModule],
    controllers: [TestsController, TestTakingController],
    providers: [TestsService, LeaderboardService, TestTakingService],
})
export class TestsModule { }
