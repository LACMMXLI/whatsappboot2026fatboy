import { Injectable, NotFoundException } from '@nestjs/common';
import { Promotion } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { CreatePromotionDto } from './dto/create-promotion.dto';
import { UpdatePromotionDto } from './dto/update-promotion.dto';

@Injectable()
export class PromotionsService {
  constructor(private readonly prisma: PrismaService) {}

  findAll(businessId: string): Promise<Promotion[]> {
    return this.prisma.promotion.findMany({
      where: { businessId },
      orderBy: { createdAt: 'desc' },
    });
  }

  findActive(businessId: string): Promise<Promotion[]> {
    return this.prisma.promotion.findMany({
      where: { businessId, active: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(businessId: string, id: string): Promise<Promotion> {
    const promotion = await this.prisma.promotion.findFirst({
      where: { id, businessId },
    });
    if (!promotion) {
      throw new NotFoundException('Promocion no encontrada');
    }
    return promotion;
  }

  create(businessId: string, dto: CreatePromotionDto): Promise<Promotion> {
    return this.prisma.promotion.create({
      data: {
        businessId,
        title: dto.title,
        description: dto.description,
        price: dto.price,
        active: dto.active ?? true,
      },
    });
  }

  async update(
    businessId: string,
    id: string,
    dto: UpdatePromotionDto,
  ): Promise<Promotion> {
    await this.findOne(businessId, id);
    return this.prisma.promotion.update({ where: { id }, data: dto });
  }

  async remove(businessId: string, id: string): Promise<void> {
    await this.findOne(businessId, id);
    await this.prisma.promotion.delete({ where: { id } });
  }
}
