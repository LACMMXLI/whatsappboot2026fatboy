import { Injectable, NotFoundException } from '@nestjs/common';
import { Customer } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class CustomersService {
  constructor(private readonly prisma: PrismaService) {}

  findAll(businessId: string): Promise<Customer[]> {
    return this.prisma.customer.findMany({
      where: { businessId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(businessId: string, id: string): Promise<Customer> {
    const customer = await this.prisma.customer.findFirst({
      where: { id, businessId },
    });
    if (!customer) {
      throw new NotFoundException('Cliente no encontrado');
    }
    return customer;
  }

  /**
   * Usado por el webhook de WhatsApp: obtiene el cliente por telefono
   * dentro del negocio, o lo crea si es la primera vez que escribe.
   */
  async findOrCreateByPhone(
    businessId: string,
    phone: string,
    name?: string,
  ): Promise<Customer> {
    const existing = await this.prisma.customer.findUnique({
      where: { businessId_phone: { businessId, phone } },
    });
    if (existing) {
      return existing;
    }
    return this.prisma.customer.create({
      data: { businessId, phone, name },
    });
  }

  /** Usado por el motor del bot cuando el cliente responde a "cual es tu nombre". */
  updateName(id: string, name: string): Promise<Customer> {
    return this.prisma.customer.update({
      where: { id },
      data: { name },
    });
  }
}
