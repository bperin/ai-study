import { Controller, Get, UseGuards, Request } from "@nestjs/common";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";

@ApiTags("users")
@Controller("users")
export class UsersController {
    constructor() {}

    @ApiBearerAuth()
    @UseGuards(JwtAuthGuard)
    @Get("me")
    getMe(@Request() req: any) {
        return req.user;
    }
}
