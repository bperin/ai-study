import { Controller, Get, UseGuards, Request } from '@nestjs/common';
import { UsersService } from './users.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { AdminGuard } from '../auth/admin.guard';
import { ApiBearerAuth, ApiTags, ApiResponse } from '@nestjs/swagger';
import { UserResponseDto } from './dto/user-response.dto';

@ApiTags('users')
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Get('me')
  @ApiResponse({ status: 200, type: UserResponseDto })
  async getMe(@Request() req: any): Promise<UserResponseDto | null> {
    const user = await this.usersService.findOne({ id: req.user.userId });
    if (user) {
      return new UserResponseDto(user);
    }
    return null;
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, AdminGuard)
  @Get()
  @ApiResponse({ status: 200, type: [UserResponseDto] })
  async findAll() {
    const users = await this.usersService.findAll();
    return users.map((user) => new UserResponseDto(user));
  }
}
