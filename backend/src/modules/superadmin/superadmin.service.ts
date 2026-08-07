import { ConflictException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Business } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { UsersService } from '../users/users.service';
import { EvolutionAdminService, EvolutionQrCode } from '../whatsapp/evolution-admin.service';
import { CreateBusinessDto } from './dto/create-business.dto';

@Injectable()
export class SuperAdminService {
  private readonly logger = new Logger(SuperAdminService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly usersService: UsersService,
    private readonly evolutionAdmin: EvolutionAdminService,
    private readonly configService: ConfigService,
  ) {}

  async listBusinesses() {
    const businesses = await this.prisma.business.findMany({
      orderBy: { createdAt: 'desc' },
      include: { _count: { select: { users: true, conversations: true } } },
    });
    return businesses;
  }

  async getBusiness(id: string) {
    const business = await this.prisma.business.findUnique({
      where: { id },
      include: { _count: { select: { users: true, conversations: true } } },
    });
    if (!business) {
      throw new NotFoundException('Negocio no encontrado');
    }
    const users = await this.usersService.findAllByBusiness(id);
    return {
      ...business,
      users: users.map(({ passwordHash: _passwordHash, ...safeUser }) => safeUser),
    };
  }

  /**
   * Da de alta un negocio nuevo (tenant) + su primer usuario ADMIN, y
   * despues intenta aprovisionar su instancia de WhatsApp. Si Evolution API
   * no responde, el negocio y el usuario quedan creados igual (nunca se
   * pierde el alta): whatsappConnectionStatus queda en ERROR con el detalle,
   * y se puede reintentar despues con retryWhatsappProvisioning.
   */
  async createBusiness(dto: CreateBusinessDto) {
    const existingEmail = await this.usersService.findByEmail(dto.adminEmail);
    if (existingEmail) {
      throw new ConflictException('Ya existe un usuario con ese email');
    }

    const business = await this.prisma.business.create({
      data: { name: dto.businessName },
    });
    const admin = await this.usersService.createWithPassword(business.id, {
      email: dto.adminEmail,
      password: dto.adminPassword,
      name: dto.adminName,
      role: 'ADMIN',
    });

    const { qrCode } = await this.provisionWhatsapp(business.id);
    const updatedBusiness = await this.prisma.business.findUniqueOrThrow({
      where: { id: business.id },
    });
    const { passwordHash: _passwordHash, ...safeAdmin } = admin;

    return { business: updatedBusiness, admin: safeAdmin, qrCode };
  }

  /**
   * Crea (o recrea) la instancia de Evolution API para un negocio: genera un
   * nombre de instancia unico basado en su id, la crea, le configura el
   * webhook compartido, y devuelve el QR para escanear. Nunca lanza: si algo
   * falla, deja el negocio en estado ERROR con el detalle y lo devuelve asi.
   * Usado tanto al crear el negocio como para "reintentar" desde el panel.
   */
  async provisionWhatsapp(businessId: string): Promise<{ qrCode?: EvolutionQrCode }> {
    const business = await this.getBusinessOrThrow(businessId);
    const instanceName = business.whatsappInstanceId ?? `biz-${business.id}`;

    await this.prisma.business.update({
      where: { id: businessId },
      data: {
        whatsappInstanceId: instanceName,
        whatsappConnectionStatus: 'CONNECTING',
        whatsappConnectionError: null,
      },
    });

    try {
      const { qrCode } = await this.evolutionAdmin.createInstance(instanceName);
      await this.configureWebhook(instanceName);
      return { qrCode };
    } catch (error) {
      await this.markError(businessId, error);
      return {};
    }
  }

  /** Pide un QR nuevo sin recrear la instancia (reconectar / QR vencido). */
  async regenerateQrCode(businessId: string): Promise<{ qrCode?: EvolutionQrCode }> {
    const business = await this.getBusinessOrThrow(businessId);
    if (!business.whatsappInstanceId) {
      return this.provisionWhatsapp(businessId);
    }
    try {
      const qrCode = await this.evolutionAdmin.getQrCode(business.whatsappInstanceId);
      await this.prisma.business.update({
        where: { id: businessId },
        data: { whatsappConnectionStatus: 'CONNECTING', whatsappConnectionError: null },
      });
      return { qrCode };
    } catch (error) {
      await this.markError(businessId, error);
      return {};
    }
  }

  /** Consulta el estado real en Evolution API y actualiza el negocio (usado para polling desde el panel). */
  async refreshConnectionStatus(businessId: string): Promise<Business> {
    const business = await this.getBusinessOrThrow(businessId);
    if (!business.whatsappInstanceId) {
      return business;
    }
    try {
      const state = await this.evolutionAdmin.getConnectionState(business.whatsappInstanceId);
      const status = state === 'open' ? 'CONNECTED' : state === 'connecting' ? 'CONNECTING' : 'DISCONNECTED';
      return this.prisma.business.update({
        where: { id: businessId },
        data: { whatsappConnectionStatus: status, whatsappConnectionError: null },
      });
    } catch (error) {
      return this.markError(businessId, error);
    }
  }

  async disconnectWhatsapp(businessId: string): Promise<Business> {
    const business = await this.getBusinessOrThrow(businessId);
    if (!business.whatsappInstanceId) {
      throw new NotFoundException('Este negocio no tiene una instancia de WhatsApp configurada');
    }
    try {
      await this.evolutionAdmin.logout(business.whatsappInstanceId);
      return this.prisma.business.update({
        where: { id: businessId },
        data: { whatsappConnectionStatus: 'DISCONNECTED' },
      });
    } catch (error) {
      return this.markError(businessId, error);
    }
  }

  async restartWhatsapp(businessId: string): Promise<Business> {
    const business = await this.getBusinessOrThrow(businessId);
    if (!business.whatsappInstanceId) {
      throw new NotFoundException('Este negocio no tiene una instancia de WhatsApp configurada');
    }
    try {
      await this.evolutionAdmin.restart(business.whatsappInstanceId);
      return this.prisma.business.update({
        where: { id: businessId },
        data: { whatsappConnectionStatus: 'CONNECTING', whatsappConnectionError: null },
      });
    } catch (error) {
      return this.markError(businessId, error);
    }
  }

  /** Elimina la instancia por completo (para recrearla desde cero con provisionWhatsapp). */
  async deleteWhatsappInstance(businessId: string): Promise<Business> {
    const business = await this.getBusinessOrThrow(businessId);
    if (business.whatsappInstanceId) {
      try {
        await this.evolutionAdmin.deleteInstance(business.whatsappInstanceId);
      } catch (error) {
        this.logger.warn(
          `No se pudo borrar la instancia ${business.whatsappInstanceId} en Evolution (se limpia igual en la base): ${
            error instanceof Error ? error.message : String(error)
          }`,
        );
      }
    }
    return this.prisma.business.update({
      where: { id: businessId },
      data: {
        whatsappInstanceId: null,
        whatsappConnectionStatus: 'PENDING',
        whatsappConnectionError: null,
      },
    });
  }

  private async configureWebhook(instanceName: string): Promise<void> {
    const appUrl = this.configService.get<string>('appUrl');
    if (!appUrl) {
      throw new Error(
        'APP_URL no esta configurado en el backend; no se puede registrar el webhook automaticamente',
      );
    }
    const webhookSecret = this.configService.get<string>('whatsapp.webhookSecret') ?? '';
    await this.evolutionAdmin.setWebhook(instanceName, `${appUrl}/webhook/whatsapp`, webhookSecret);
  }

  private async getBusinessOrThrow(businessId: string): Promise<Business> {
    const business = await this.prisma.business.findUnique({ where: { id: businessId } });
    if (!business) {
      throw new NotFoundException('Negocio no encontrado');
    }
    return business;
  }

  private async markError(businessId: string, error: unknown): Promise<Business> {
    const message = error instanceof Error ? error.message : String(error);
    this.logger.error(`Error de Evolution API para negocio ${businessId}: ${message}`);
    return this.prisma.business.update({
      where: { id: businessId },
      data: { whatsappConnectionStatus: 'ERROR', whatsappConnectionError: message },
    });
  }
}
