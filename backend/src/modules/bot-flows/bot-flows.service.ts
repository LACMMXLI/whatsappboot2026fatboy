import { Injectable, NotFoundException } from '@nestjs/common';
import { BotFlow, BotFlowStep } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateFlowDto } from './dto/create-flow.dto';

export type FlowStepOption = { label: string; gotoStep: number | null };

/** Un BotFlow con sus steps, tal como lo consume el motor del bot. */
export type FlowWithSteps = BotFlow & { steps: BotFlowStep[] };

@Injectable()
export class BotFlowsService {
  constructor(private readonly prisma: PrismaService) {}

  findAll(businessId: string): Promise<FlowWithSteps[]> {
    return this.prisma.botFlow.findMany({
      where: { businessId },
      include: { steps: { orderBy: { order: 'asc' } } },
      orderBy: { createdAt: 'asc' },
    });
  }

  /** Usado por el motor del bot: solo flujos activos, con sus pasos. */
  findActiveForEngine(businessId: string): Promise<FlowWithSteps[]> {
    return this.prisma.botFlow.findMany({
      where: { businessId, active: true },
      include: { steps: { orderBy: { order: 'asc' } } },
    });
  }

  async create(businessId: string, dto: CreateFlowDto): Promise<FlowWithSteps> {
    const flow = await this.prisma.botFlow.create({
      data: {
        businessId,
        name: dto.name,
        triggers: dto.triggers.map((t) => t.trim()).filter(Boolean),
        active: dto.active ?? true,
        steps: {
          create: dto.steps.map((step, index) => ({
            order: index,
            message: step.message,
            options: (step.options ?? []) as unknown as object,
          })),
        },
      },
      include: { steps: { orderBy: { order: 'asc' } } },
    });
    return flow;
  }

  async update(businessId: string, id: string, dto: CreateFlowDto): Promise<FlowWithSteps> {
    await this.assertOwnership(businessId, id);

    // Reemplazo completo: borrar y recrear los steps es mas simple y
    // confiable que diffear un array de Json contra la version anterior,
    // y coincide con como la UI edita/guarda el flujo entero de una vez.
    return this.prisma.$transaction(async (tx) => {
      await tx.botFlowStep.deleteMany({ where: { flowId: id } });
      const flow = await tx.botFlow.update({
        where: { id },
        data: {
          name: dto.name,
          triggers: dto.triggers.map((t) => t.trim()).filter(Boolean),
          ...(dto.active !== undefined ? { active: dto.active } : {}),
          steps: {
            create: dto.steps.map((step, index) => ({
              order: index,
              message: step.message,
              options: (step.options ?? []) as unknown as object,
            })),
          },
        },
        include: { steps: { orderBy: { order: 'asc' } } },
      });
      return flow;
    });
  }

  async toggleActive(businessId: string, id: string, active: boolean): Promise<FlowWithSteps> {
    await this.assertOwnership(businessId, id);
    return this.prisma.botFlow.update({
      where: { id },
      data: { active },
      include: { steps: { orderBy: { order: 'asc' } } },
    });
  }

  async remove(businessId: string, id: string): Promise<void> {
    await this.assertOwnership(businessId, id);
    await this.prisma.botFlow.delete({ where: { id } });
  }

  private async assertOwnership(businessId: string, id: string): Promise<void> {
    const flow = await this.prisma.botFlow.findFirst({ where: { id, businessId } });
    if (!flow) {
      throw new NotFoundException('Flujo no encontrado');
    }
  }
}
