import {
  Controller,
  Get,
  Post,
  Body,
  Delete,
  Res,
  UseGuards,
  UnauthorizedException,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import type { Response } from 'express';
import { JwtAuthGuard } from './guards/jwt.auth-guard';
import type { RequestUser } from './types/JwtPayload';
import { GetUser } from './decorators/get-user.decorator';
import { AuthGuard } from '@nestjs/passport';
import { VerifyEmailDto } from './dto/verify-email.dto';
import { Throttle } from '@nestjs/throttler';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { ResendOtpDto } from './dto/resend-otp.dto';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Get()
  findAll() {
    return this.authService.findAll();
  }

  @Post('signup')
  async signup(@Body() createUserDto: CreateUserDto) {
    const result = await this.authService.create(createUserDto);
    return result;
  }

  @Post('signin')
  async signin(
    @Body() createUserDto: CreateUserDto,
    @Res({ passthrough: true }) response: Response,
  ) {
    const { user, access_token, refresh_token } =
      await this.authService.signin(createUserDto);

    this.authService.setCookies(response, { access_token, refresh_token });

    return {
      user,
    };
  }

  @Post('signout')
  signout(@Res({ passthrough: true }) response: Response) {
    this.authService.removeCookies(response);
    return { message: 'Signed out successfully' };
  }

  @Post('verify-email')
  async verifyEmail(
    @Body() dto: VerifyEmailDto,
    @Res({ passthrough: true }) response: Response,
  ) {
    const result = await this.authService.verifyEmail(dto.email, dto.otp);
    this.authService.setCookies(response, {
      access_token: result.access_token,
      refresh_token: result.refresh_token,
    });
    return {
      message: 'User verified successfully',
      user: result.user,
    };
  }

  @Throttle({ default: { limit: 1, ttl: 60_000 } })
  @Post('resend-otp')
  async resendOtp(@Body() dto: ResendOtpDto) {
    return await this.authService.resendOtp(dto.email);
  }

  @Throttle({ default: { limit: 1, ttl: 60_000 } })
  @Post('forgot-password')
  async forgotPassword(@Body() dto: ForgotPasswordDto) {
    return await this.authService.forgotPassword(dto.email);
  }

  @Post('reset-password')
  async resetPassword(@Body() dto: ResetPasswordDto) {
    return await this.authService.resetPassword(dto.token, dto.password);
  }

  @UseGuards(JwtAuthGuard)
  @Post('update')
  update(@GetUser() user: RequestUser, @Body() updateUserDto: UpdateUserDto) {
    return this.authService.update(user.id, updateUserDto);
  }

  @Post('refresh')
  @UseGuards(AuthGuard('jwt-refresh'))
  async refresh(
    @GetUser() user: RequestUser,
    @Res({ passthrough: true }) response: Response,
  ) {
    if (!user?.refreshToken) {
      throw new UnauthorizedException('No refresh token given');
    }

    const result = await this.authService.refresh(user.id, user?.refreshToken);

    this.authService.setCookies(response, { ...result });

    return {
      message: 'Token refreshed',
    };
  }

  @UseGuards(JwtAuthGuard)
  @Delete()
  remove(@GetUser() user: RequestUser) {
    return this.authService.remove(user.id);
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  getMe(@GetUser() user: RequestUser) {
    const { id, email } = user;
    return {
      id,
      email,
    };
  }
}
