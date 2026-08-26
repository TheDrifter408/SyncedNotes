import { Controller, Post, Body, UseGuards } from '@nestjs/common';
import { SyncService } from './sync.service';
import { SyncChangesDto } from './dto/sync-changes.dto';
import { JwtAuthGuard } from '@/auth/guards/jwt.auth-guard';
import { GetUser } from '@/auth/decorators/get-user.decorator';
import type { RequestUser } from '@/auth/types/JwtPayload';

@Controller('sync')
export class SyncController {
  constructor(private readonly syncService: SyncService) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  async sync(@GetUser() user: RequestUser, @Body() dto: SyncChangesDto) {
    return this.syncService.sync(user.id, dto);
  }
}
