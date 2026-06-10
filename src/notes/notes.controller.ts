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
import { NotesService } from './notes.service';
import { CreateNoteDto } from './dto/create-note.dto';
import { UpdateNoteDto } from './dto/update-note.dto';
import { JwtAuthGuard } from '../auth/guards/jwt.auth-guard';
import type { RequestUser } from 'src/auth/types/JwtPayload';
import { GetUser } from '../auth/decorators/get-user.decorator';
import { SyncNotesDto } from './dto/sync-notes.dto';
import { SyncService } from './sync.service';

@UseGuards(JwtAuthGuard)
@Controller('notes')
export class NotesController {
  constructor(
    private readonly notesService: NotesService,
    private readonly syncService: SyncService,
  ) {}

  @UseGuards(JwtAuthGuard)
  @Post()
  create(@GetUser() user: RequestUser, @Body() createNoteDto: CreateNoteDto) {
    return this.notesService.create(user.id, createNoteDto);
  }

  @UseGuards(JwtAuthGuard)
  @Get()
  findAll(@GetUser() user: RequestUser) {
    return this.notesService.findAll(user.id);
  }

  @UseGuards(JwtAuthGuard)
  @Get(':id')
  findOne(@GetUser() user: RequestUser, @Param('id') id: string) {
    return this.notesService.findOne(user.id, id);
  }

  @UseGuards(JwtAuthGuard)
  @Patch(':id')
  update(
    @GetUser() user: RequestUser,
    @Param('id') id: string,
    @Body() updateNoteDto: UpdateNoteDto,
  ) {
    return this.notesService.update(user.id, id, updateNoteDto);
  }

  @UseGuards(JwtAuthGuard)
  @Delete(':id')
  remove(@GetUser() user: RequestUser, @Param('id') id: string) {
    return this.notesService.remove(user.id, id);
  }

  @Post('sync')
  async sync(@GetUser() user: RequestUser, @Body() syncDto: SyncNotesDto) {
    return this.syncService.processSync(user.id, syncDto);
  }
}
