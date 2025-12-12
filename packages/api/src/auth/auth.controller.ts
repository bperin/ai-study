import { Body, Controller, Post, HttpCode, HttpStatus } from "@nestjs/common";
import { ApiTags, ApiResponse } from "@nestjs/swagger";
import { AuthService } from "./auth.service";
import { CreateUserDto } from "../users/dto/create-user.dto";
import { LoginDto } from "./dto/login.dto";
import { AuthResponseDto } from "./dto/auth-response.dto";

@ApiTags("auth")
@Controller("auth")
export class AuthController {
    constructor(private authService: AuthService) {}

    @HttpCode(HttpStatus.OK)
    @Post("login")
    @ApiResponse({ status: 200, type: AuthResponseDto })
    signIn(@Body() signInDto: LoginDto) {
        return this.authService.signIn(signInDto.email, signInDto.password);
    }

    @Post("register")
    @ApiResponse({ status: 201, type: AuthResponseDto })
    register(@Body() createUserDto: CreateUserDto) {
        return this.authService.register(createUserDto);
    }
}
