import { Injectable, NotFoundException } from '@nestjs/common';
import { Product } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { normalizeText } from '../../common/utils/text-normalize';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';

@Injectable()
export class ProductsService {
  constructor(private readonly prisma: PrismaService) {}

  findAll(businessId: string): Promise<Product[]> {
    return this.prisma.product.findMany({
      where: { businessId },
      orderBy: { name: 'asc' },
    });
  }

  async findOne(businessId: string, id: string): Promise<Product> {
    const product = await this.prisma.product.findFirst({
      where: { id, businessId },
    });
    if (!product) {
      throw new NotFoundException('Producto no encontrado');
    }
    return product;
  }

  create(businessId: string, dto: CreateProductDto): Promise<Product> {
    return this.prisma.product.create({
      data: {
        businessId,
        name: dto.name,
        category: dto.category,
        price: dto.price,
        aliases: dto.aliases ?? [],
        active: dto.active ?? true,
      },
    });
  }

  async update(
    businessId: string,
    id: string,
    dto: UpdateProductDto,
  ): Promise<Product> {
    await this.findOne(businessId, id);
    return this.prisma.product.update({
      where: { id },
      data: dto,
    });
  }

  async remove(businessId: string, id: string): Promise<void> {
    await this.findOne(businessId, id);
    await this.prisma.product.delete({ where: { id } });
  }

  /**
   * Crea o actualiza productos en lote (usado por /products/upload).
   * Empareja por nombre normalizado dentro del mismo negocio: permite
   * actualizar el catalogo sin reiniciar el servicio.
   */
  async bulkUpsert(
    businessId: string,
    items: CreateProductDto[],
  ): Promise<Product[]> {
    const existing = await this.prisma.product.findMany({
      where: { businessId },
    });
    const byNormalizedName = new Map(
      existing.map((p) => [normalizeText(p.name), p]),
    );

    const results: Product[] = [];
    for (const item of items) {
      const key = normalizeText(item.name);
      const found = byNormalizedName.get(key);
      if (found) {
        const updated = await this.prisma.product.update({
          where: { id: found.id },
          data: {
            category: item.category,
            price: item.price,
            aliases: item.aliases ?? found.aliases,
            active: item.active ?? found.active,
          },
        });
        results.push(updated);
      } else {
        const created = await this.prisma.product.create({
          data: {
            businessId,
            name: item.name,
            category: item.category,
            price: item.price,
            aliases: item.aliases ?? [],
            active: item.active ?? true,
          },
        });
        results.push(created);
      }
    }
    return results;
  }

  /**
   * Busca productos activos por nombre o alias (usado por el bot y por /products/search).
   * Tolerante a mayusculas/acentos y a coincidencias parciales.
   */
  async search(businessId: string, query: string): Promise<Product[]> {
    const normalizedQuery = normalizeText(query);
    if (!normalizedQuery) {
      return [];
    }
    const activeProducts = await this.prisma.product.findMany({
      where: { businessId, active: true },
    });
    return activeProducts.filter((product) => {
      const normalizedName = normalizeText(product.name);
      if (normalizedName.includes(normalizedQuery)) {
        return true;
      }
      return product.aliases.some((alias) =>
        normalizeText(alias).includes(normalizedQuery),
      );
    });
  }
}
