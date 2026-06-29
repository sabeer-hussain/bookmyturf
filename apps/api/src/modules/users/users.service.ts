import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { UpdateUserDto } from './dto/user.dto';

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  async findById(id: string, requesterId: string, requesterRole: string) {
    if (requesterRole !== 'SUPER_ADMIN' && requesterId !== id) {
      throw new ForbiddenException('Access denied');
    }
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) throw new NotFoundException('User not found');
    return this.sanitize(user);
  }

  async update(id: string, dto: UpdateUserDto, requesterId: string, requesterRole: string) {
    if (requesterRole !== 'SUPER_ADMIN' && requesterId !== id) {
      throw new ForbiddenException('Can only update your own profile');
    }
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) throw new NotFoundException('User not found');

    const updated = await this.prisma.user.update({ where: { id }, data: dto });
    return this.sanitize(updated);
  }

  private sanitize(user: any) {
    const { refreshToken, ...safe } = user;
    return safe;
  }
}
