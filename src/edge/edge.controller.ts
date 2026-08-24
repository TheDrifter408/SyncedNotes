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
import { EdgeService } from './edge.service';
import { BaseEdgeDto } from './dto/create-edge.dto';
import { UpdateEdgeDto } from './dto/update-edge.dto';
import { JwtAuthGuard } from '@/auth/guards/jwt.auth-guard';
import type { RequestUser } from '@/auth/types/JwtPayload';
import { GetUser } from '@/auth/decorators/get-user.decorator';

@UseGuards(JwtAuthGuard)
@Controller('edge')
export class EdgeController {
  constructor(private readonly edgeService: EdgeService) {}

  @Post()
  create(@GetUser() user: RequestUser, @Body() BaseEdgeDto: BaseEdgeDto) {
    return this.edgeService.create(BaseEdgeDto, user.id);
  }

  @Get()
  findAll() {
    return this.edgeService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.edgeService.findOne(+id);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @GetUser() user: RequestUser,
    @Body() updateEdgeDto: UpdateEdgeDto,
  ) {
    return this.edgeService.update(id, updateEdgeDto, user.id);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.edgeService.remove(id);
  }
}
