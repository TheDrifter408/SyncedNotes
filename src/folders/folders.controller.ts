import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
} from '@nestjs/common';
import { FoldersService } from './folders.service';
import { CreateFolderDto } from './dto/create-folder.dto';
import { UpdateFolderDto } from './dto/update-folder.dto';
import { type RequestUser } from '@/auth/types/JwtPayload';
import { GetUser } from '@/auth/decorators/get-user.decorator';
import { JwtAuthGuard } from '@/auth/guards/jwt.auth-guard';

@UseGuards(JwtAuthGuard)
@Controller('folders')
export class FoldersController {
  constructor(private readonly foldersService: FoldersService) {}

  @Post()
  create(
    @GetUser() user: RequestUser,
    @Body() createFolderDto: CreateFolderDto,
  ) {
    return this.foldersService.create(user.id, createFolderDto);
  }

  @Get()
  findAll(@GetUser() user: RequestUser) {
    return this.foldersService.findAll(user.id);
  }

  @Get(':id')
  findOne(@GetUser() user: RequestUser, @Param('id') id: string) {
    return this.foldersService.findOne(user.id, +id);
  }

  @Patch(':id')
  update(
    @GetUser() user: RequestUser,
    @Param('id') id: string,
    @Body() updateFolderDto: UpdateFolderDto,
  ) {
    return this.foldersService.update(user.id, updateFolderDto);
  }

  @Delete(':id')
  remove(@GetUser() user: RequestUser, @Param('id') id: string) {
    return this.foldersService.remove(user.id, +id);
  }
}
