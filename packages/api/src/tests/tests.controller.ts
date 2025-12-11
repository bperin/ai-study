import { Body, Controller, Post, UseGuards, Request } from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { SubmitTestDto } from "./dto/submit-test.dto";
import { TestsService } from "./tests.service";

@ApiTags("tests")
@Controller("tests")
export class TestsController {
    constructor(private testsService: TestsService) {}

    @ApiBearerAuth()
    @UseGuards(JwtAuthGuard)
    @Post("submit")
    submitTest(@Request() req: any, @Body() dto: SubmitTestDto) {
        return this.testsService.submitTest(req.user.userId, dto);
    }
}
