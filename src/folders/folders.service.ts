import { Injectable } from '@nestjs/common';
import { CreateFolderDto } from './dto/create-folder.dto';
import { UpdateFolderDto } from './dto/update-folder.dto';
import { Prisma } from '@/prisma/prisma.service';

@Injectable()
export class FoldersService {
  constructor(private prisma: Prisma) {}

  async create(userId: number, createFolderDto: CreateFolderDto) {
    const found = await this.prisma.folder({
      where: {
        id: userId,
      },
    });
    if (found) {
      return found;
    }
  }

  async findAll(userId: number) {
    return `This action returns all folders`;
  }

  async findOne(userId: number, folderId: number) {
    return `This action returns a #${id} folder`;
  }

  async update(userId: number, updateFolderDto: UpdateFolderDto) {
    return `This action updates a #${id} folder`;
  }

  async remove(userId: number, folderId: number) {
    return `This action removes a #${id} folder`;
  }
}
