import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { Business } from '@prisma/client';

@Injectable()
export class BusinessesService {
  constructor(private readonly prisma: PrismaService) {}

  create(name: string): Promise<Business> {
    return this.prisma.business.create({ data: { name } });
  }

  findById(id: string): Promise<Business | null> {
    return this.prisma.business.findUnique({ where: { id } });
  }

  /**
   * Resuelve el negocio a partir del nombre de instancia de Evolution API
   * que llega en cada webhook. Soporta multiples negocios con multiples
   * instancias de WhatsApp.
   */
  findByWhatsappInstance(instanceId: string): Promise<Business | null> {
    return this.prisma.business.findFirst({
      where: { whatsappInstanceId: instanceId },
    });
  }

  updateWhatsappInstance(
    businessId: string,
    whatsappInstanceId: string,
  ): Promise<Business> {
    return this.prisma.business.update({
      where: { id: businessId },
      data: { whatsappInstanceId },
    });
  }

  updateSettings(
    businessId: string,
    settings: {
      waitingThresholdMinutes?: number;
      reactivateBotOnRelease?: boolean;
      pickupAddress?: string;
    },
  ): Promise<Business> {
    return this.prisma.business.update({
      where: { id: businessId },
      data: settings,
    });
  }
}
