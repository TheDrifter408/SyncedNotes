import { Injectable, NotFoundException } from '@nestjs/common';
import { CreateFolderDto } from './dto/create-folder.dto';
import { UpdateFolderDto } from './dto/update-folder.dto';
import { Prisma } from '@/prisma/prisma.service';

@Injectable()
export class FoldersService {
  constructor(private prisma: Prisma) {}

  async create(userId: number, createFolderDto: CreateFolderDto) {
    const found = await this.prisma.folder.findFirst({
      where: {
        id: createFolderDto.id,
        userId: userId,
        isDeleted: false,
      },
      select: {
        id: true,
        name: true,
        color: true,
        updatedAt: true,
        isDeleted: true,
      },
    });
    if (found) {
      return found;
    }
    const created = await this.prisma.folder.create({
      data: {
        ...createFolderDto,
        userId: userId,
      },
    });
    return created;
  }

  async findOne(userId: number, folderId: string) {
    const found = await this.prisma.folder.findFirst({
      where: {
        id: folderId,
        userId,
      },
    });
    if (!found) {
      throw new NotFoundException('Folder not found');
    }
    return found;
  }

  async update(userId: number, updateFolderDto: UpdateFolderDto) {
    const found = await this.prisma.folder.findFirst({
      where: {
        id: updateFolderDto.id,
        userId,
      },
    });
    if (!found) {
      throw new NotFoundException('Folder not found');
    }
    const updated = await this.prisma.folder.update({
      where: {
        id: found.id,
        userId,
      },
      data: {
        ...updateFolderDto,
        userId,
      },
    });
    return updated;
  }

  async remove(userId: number, folderId: string) {
    const folderToDelete = await this.prisma.folder.update({
      where: {
        id: folderId,
        userId,
      },
      data: {
        isDeleted: true,
      },
    });
    if (!folderToDelete) {
      throw new NotFoundException('Folder Not found');
    }
    return { data: null, message: 'Folder successfully deleted' };
  }
}
