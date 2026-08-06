import { Injectable, NotFoundException } from '@nestjs/common';
import { BotIntentType, BotKeywordRule } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { CustomKeywords, ExtendableIntent } from '../bot/intent-detector.service';

@Injectable()
export class BotKeywordRulesService {
  constructor(private readonly prisma: PrismaService) {}

  findAll(businessId: string): Promise<BotKeywordRule[]> {
    return this.prisma.botKeywordRule.findMany({
      where: { businessId },
      orderBy: [{ intent: 'asc' }, { createdAt: 'asc' }],
    });
  }

  create(businessId: string, intent: BotIntentType, phrase: string): Promise<BotKeywordRule> {
    return this.prisma.botKeywordRule.create({
      data: { businessId, intent, phrase: phrase.trim() },
    });
  }

  async remove(businessId: string, id: string): Promise<void> {
    const rule = await this.prisma.botKeywordRule.findFirst({
      where: { id, businessId },
    });
    if (!rule) {
      throw new NotFoundException('Palabra clave no encontrada');
    }
    await this.prisma.botKeywordRule.delete({ where: { id } });
  }

  /** Usado por el motor del bot: todas las frases custom, agrupadas por intencion. */
  async getKeywordsMap(businessId: string): Promise<CustomKeywords> {
    const rules = await this.prisma.botKeywordRule.findMany({ where: { businessId } });
    const map: CustomKeywords = {};
    for (const rule of rules) {
      const intent = rule.intent as ExtendableIntent;
      map[intent] = [...(map[intent] ?? []), rule.phrase];
    }
    return map;
  }
}
