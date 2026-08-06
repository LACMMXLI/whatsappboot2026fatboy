import { Injectable } from '@nestjs/common';
import { BotTemplateKey } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { DEFAULT_BOT_TEMPLATES, BotTemplates } from '../bot/response-generator.service';

const ALL_KEYS = Object.keys(DEFAULT_BOT_TEMPLATES) as BotTemplateKey[];

export interface TemplateView {
  key: BotTemplateKey;
  content: string;
  isCustom: boolean;
  defaultContent: string;
}

@Injectable()
export class BotResponseTemplatesService {
  constructor(private readonly prisma: PrismaService) {}

  /** Los 4 mensajes editables, con el override del negocio si existe. */
  async findAll(businessId: string): Promise<TemplateView[]> {
    const overrides = await this.prisma.botResponseTemplate.findMany({
      where: { businessId },
    });
    const byKey = new Map(overrides.map((o) => [o.key, o.content]));
    return ALL_KEYS.map((key) => ({
      key,
      content: byKey.get(key) ?? DEFAULT_BOT_TEMPLATES[key],
      isCustom: byKey.has(key),
      defaultContent: DEFAULT_BOT_TEMPLATES[key],
    }));
  }

  async update(businessId: string, key: BotTemplateKey, content: string): Promise<TemplateView> {
    await this.prisma.botResponseTemplate.upsert({
      where: { businessId_key: { businessId, key } },
      create: { businessId, key, content },
      update: { content },
    });
    return {
      key,
      content,
      isCustom: true,
      defaultContent: DEFAULT_BOT_TEMPLATES[key],
    };
  }

  /** Vuelve al texto por defecto (borra el override). */
  async reset(businessId: string, key: BotTemplateKey): Promise<TemplateView> {
    await this.prisma.botResponseTemplate.deleteMany({ where: { businessId, key } });
    return {
      key,
      content: DEFAULT_BOT_TEMPLATES[key],
      isCustom: false,
      defaultContent: DEFAULT_BOT_TEMPLATES[key],
    };
  }

  /**
   * Usado por el motor del bot: solo los overrides (partial), listos para
   * pasarle a ResponseGeneratorService.
   */
  async getOverridesMap(businessId: string): Promise<BotTemplates> {
    const overrides = await this.prisma.botResponseTemplate.findMany({
      where: { businessId },
    });
    return Object.fromEntries(overrides.map((o) => [o.key, o.content])) as BotTemplates;
  }
}
