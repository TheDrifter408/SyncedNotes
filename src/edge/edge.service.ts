import { Injectable, NotFoundException } from '@nestjs/common';
import { BaseEdgeDto } from './dto/create-edge.dto';
import { UpdateEdgeDto } from './dto/update-edge.dto';
import { Prisma } from '@/prisma/prisma.service';

@Injectable()
export class EdgeService {
  constructor(private readonly prisma: Prisma) {}

  async create(BaseEdgeDto: BaseEdgeDto, userId: number) {
    const existingEdge = await this.prisma.edge.findFirst({
      where: { sourceId: BaseEdgeDto.sourceId, targetId: BaseEdgeDto.targetId },
    });
    if (existingEdge) {
      return existingEdge;
    }
    return this.prisma.edge.create({
      data: {
        ...BaseEdgeDto,
        userId,
        isDeleted: false,
      },
    });
  }

  findAll() {
    return `This action returns all edge`;
  }

  findOne(id: number) {
    return `This action returns a #${id} edge`;
  }

  async update(id: string, updateEdgeDto: UpdateEdgeDto, userId: number) {
    const existing = await this.prisma.edge.findUnique({
      where: { id },
    });
    if (!existing) {
      throw new NotFoundException(`Edge with id ${updateEdgeDto.id} not found`);
    }
    return this.prisma.edge.update({
      where: { id },
      data: { ...updateEdgeDto, userId },
    });
  }

  async remove(id: string) {
    const existing = await this.prisma.edge.findUnique({
      where: { id },
    });
    if (!existing) {
      throw new NotFoundException(`Edge with id ${id} not found`);
    }
    return this.prisma.edge.update({
      where: { id },
      data: { isDeleted: true, deletedAt: new Date().toISOString() },
    });
  }
}
