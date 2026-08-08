import {
  BadRequestException,
  ForbiddenException,
  HttpException,
  HttpStatus,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { Prisma } from '../prisma/prisma.service';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';

import * as bcrypt from 'bcrypt';
import { BCRYPT_SALT_ROUNDS } from '../constants';
import { Response } from 'express';
import { MailService } from '@/mail/mail.service';
import crypto from 'crypto';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: Prisma,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly mailService: MailService,
  ) {}

  async create(createUserDto: CreateUserDto) {
    const found = await this.prisma.user.findUnique({
      where: {
        email: createUserDto.email,
      },
    });

    if (found) {
      if (found.isVerified) {
        // The User is found and has already been verified
        throw new HttpException(
          'This email is already exists',
          HttpStatus.CONFLICT,
        );
      } else {
        // The User is found but not verified, resend the verification email
        const otp = found.otpCode ? found.otpCode : this.generateOtp();

        await this.prisma.user.update({
          where: {
            id: found.id,
          },
          data: {
            otpCode: otp,
            otpCodeExpiresAt: new Date(Date.now() + 10 * 60 * 1000),
          },
        });

        await this.mailService.sendVerificationEmail(found.email, otp);

        return { message: 'Verification email sent' };
      }
    }

    if (!found) {
      // The User is not found, create a new one
      const hashed = await bcrypt.hash(
        createUserDto.password,
        BCRYPT_SALT_ROUNDS,
      );
      const otp = this.generateOtp();

      await this.prisma.user.create({
        data: {
          email: createUserDto.email,
          password_hash: hashed,
          otpCode: otp,
          otpCodeExpiresAt: new Date(Date.now() + 10 * 60 * 1000),
        },
      });
      // Send the verification email to the new user
      await this.mailService.sendVerificationEmail(createUserDto.email, otp);

      return { message: 'Verification email sent' };
    }

    throw new HttpException(
      'This email is already exists',
      HttpStatus.CONFLICT,
    );
  }

  async verifyEmail(email: string, otp: string) {
    const user = await this.prisma.user.findUnique({
      where: {
        email,
      },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const now = new Date();

    if (
      user.otpCode !== otp ||
      user.otpCodeExpiresAt === null ||
      user.otpCodeExpiresAt < now
    ) {
      throw new BadRequestException('Invalid or expired OTP');
    }

    if (user.isVerified) {
      throw new BadRequestException('Email already verified');
    }

    await this.prisma.user.update({
      where: {
        id: user.id,
      },
      data: {
        isVerified: true,
        otpCode: null,
        otpCodeExpiresAt: null,
      },
    });

    const tokens = await this.getTokens(user.id, user.email);

    await this.updateHashedRefreshToken(user.id, tokens.refresh_token);

    return {
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token,
      user: {
        id: user.id,
        email: user.email,
      },
    };
  }
  // TODO: This endpoint will be used in the Admin Panel later
  findAll() {
    return `This action returns all auth`;
  }
  // TODO: This endpoint will be used in the Admin panel later.
  findOne(id: number) {
    return `This action returns a #${id} auth`;
  }

  async signin(createUserDto: Omit<CreateUserDto, 'name'>) {
    const user = await this.prisma.user.findUnique({
      where: {
        email: createUserDto.email,
      },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const passwordHashMatches = await bcrypt.compare(
      createUserDto.password,
      user.password_hash,
    );

    if (!passwordHashMatches) {
      throw new UnauthorizedException('Invalid Credentials');
    }

    if (!user.isVerified) {
      throw new ForbiddenException('User not verified');
    }

    if (passwordHashMatches) {
      const tokens = await this.getTokens(user.id, user.email);

      return {
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
        },
        ...tokens,
      };
    }

    throw new UnauthorizedException('Invalid Credentials');
  }

  async update(userId: number, updateUserDto: UpdateUserDto) {
    const user = await this.prisma.user.update({
      data: {
        ...updateUserDto,
      },
      where: {
        id: userId,
      },
    });
    if (!user) {
      throw new HttpException('Not Found', HttpStatus.NOT_FOUND);
    }
    return user;
  }

  async remove(userId: number) {
    const result = await this.prisma.user.delete({
      where: {
        id: userId,
      },
    });
    if (!result) {
      throw new HttpException('Not found', HttpStatus.NOT_FOUND);
    }
    return result;
  }

  async refresh(userId: number, refreshToken: string) {
    const user = await this.prisma.user.findUnique({
      where: {
        id: userId,
      },
    });

    if (!user || !user.hashed_refresh_token) {
      throw new ForbiddenException('Access Denied');
    }

    const tokenMatches = await bcrypt.compare(
      refreshToken,
      user.hashed_refresh_token,
    );

    if (!tokenMatches) {
      await this.prisma.user.update({
        where: {
          id: user.id,
        },
        data: {
          hashed_refresh_token: null,
        },
      });
      throw new ForbiddenException('Access Denied');
    }

    const tokens = await this.getTokens(user.id, user.email);

    await this.updateHashedRefreshToken(user.id, tokens.refresh_token);

    return tokens;
  }

  async forgotPassword(email: string) {
    const user = await this.prisma.user.findUnique({
      where: {
        email,
      },
    });

    if (!user) {
      return {
        message: 'If email exist, a reset link has been sent to your email',
      };
    }

    const passwordResetToken = this.generateResetToken();

    await this.prisma.user.update({
      where: {
        email,
      },
      data: {
        passwordResetToken,
        passwordResetTokenExpiresAt: new Date(Date.now() + 3600000),
      },
    });
    const frontendUrl = this.configService.get<string>(
      'FRONTEND_URL',
      'http://localhost:5173',
    );

    await this.mailService.sendPasswordResetEmail(
      email,
      `${frontendUrl}/auth/reset-password?token=${passwordResetToken}`,
    );

    return { message: 'Password reset email sent' };
  }

  async resetPassword(token: string, newPassword: string) {
    const user = await this.prisma.user.findFirst({
      where: {
        passwordResetToken: token,
      },
    });

    if (!user) {
      throw new NotFoundException('Invalid reset token');
    }

    if (
      user.passwordResetTokenExpiresAt &&
      user.passwordResetTokenExpiresAt < new Date()
    ) {
      throw new ForbiddenException('Reset token has expired');
    }

    const hashedPassword = await bcrypt.hash(newPassword, BCRYPT_SALT_ROUNDS);

    await this.prisma.user.update({
      where: {
        id: user.id,
      },
      data: {
        password_hash: hashedPassword,
        passwordResetToken: null,
        passwordResetTokenExpiresAt: null,
      },
    });

    return { message: 'Password reset successfully' };
  }

  // Helper function to generate access and refresh tokens
  async getTokens(userId: number, email: string) {
    const payload = {
      sub: userId,
      email,
    };
    const [accessToken, refreshToken] = await Promise.all([
      // 1. The access token
      this.jwtService.signAsync(payload),
      // 2. The refresh token that uses a different secret key
      this.jwtService.signAsync(payload, {
        secret: this.configService.get<string>('JWT_REFRESH_SECRET'),
        expiresIn: '7d',
      }),
    ]);

    return {
      access_token: accessToken,
      refresh_token: refreshToken,
    };
  }

  async updateHashedRefreshToken(userId: number, token: string | null) {
    let hashedRefreshToken: string | null = null;

    if (token) {
      hashedRefreshToken = await bcrypt.hash(token, BCRYPT_SALT_ROUNDS);
    }

    await this.prisma.user.update({
      where: {
        id: userId,
      },
      data: {
        hashed_refresh_token: hashedRefreshToken,
      },
    });
  }

  setCookies(
    response: Response,
    tokens: { access_token: string; refresh_token: string },
  ) {
    const isProduction = this.configService.get('NODE_ENV') === 'production';

    const accessTokenMaxAge = Number(
      this.configService.get('JWT_ACCESS_TOKEN_MAX_AGE'),
    );
    const refreshTokenMaxAge = Number(
      this.configService.get('JWT_REFRESH_TOKEN_MAX_AGE'),
    );

    const commonOptions = {
      httpOnly: true,
      secure: isProduction,
      sameSite: 'lax' as const,
      path: '/',
    };

    response.cookie('access_token', tokens.access_token, {
      ...commonOptions,
      maxAge: accessTokenMaxAge,
    });

    response.cookie('refresh_token', tokens.refresh_token, {
      ...commonOptions,
      maxAge: refreshTokenMaxAge,
    });
  }

  removeCookies(response: Response) {
    const isProduction = this.configService.get('NODE_ENV') === 'production';

    response.clearCookie('access_token', {
      httpOnly: true,
      secure: isProduction,
      sameSite: 'lax' as const,
      path: '/',
    });

    response.clearCookie('refresh_token', {
      httpOnly: true,
      secure: isProduction,
      sameSite: 'lax' as const,
      path: '/',
    });
  }

  private generateOtp(): string {
    return Math.floor(100000 + Math.random() * 900000).toString();
  }

  private generateResetToken(): string {
    return crypto.randomBytes(32).toString('hex');
  }

  async resendOtp(email: string) {
    const user = await this.prisma.user.findUnique({
      where: { email },
    });

    if (!user || user.isVerified) {
      return {
        message:
          'If your email is registered, you will receive an OTP shortly.',
      };
    }

    const otp = this.generateOtp();

    await this.prisma.user.update({
      where: { email },
      data: {
        otpCode: otp,
        otpCodeExpiresAt: new Date(Date.now() + 10 * 60 * 1000),
      },
    });

    await this.mailService.sendVerificationEmail(email, otp);

    return { message: 'OTP resent successfully' };
  }
}
