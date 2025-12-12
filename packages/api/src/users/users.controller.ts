import { Controller, Get, UseGuards, Request } from "@nestjs/common";
import { UsersService } from "./users.service";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { AdminGuard } from "../auth/admin.guard";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";

@ApiTags("users")
@Controller("users")
export class UsersController {
    constructor(private readonly usersService: UsersService) {}

    @ApiBearerAuth()
    @UseGuards(JwtAuthGuard)
    @Get("me")
    async getMe(@Request() req: any) {
        const user = await this.usersService.findOne({ id: req.user.userId });
        if (user) {
            // eslint-disable-next-line @typescript-eslint/no-unused-vars
            const { password, ...result } = user;
            return result;
        }
        return null;
    }

    @ApiBearerAuth()
    @UseGuards(JwtAuthGuard, AdminGuard)
    @Get()
    async findAll() {
        return this.usersService.findAll();
    }
}
