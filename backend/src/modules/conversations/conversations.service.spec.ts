import { ConversationsService } from './conversations.service';

function baseConversationRow(overrides: Record<string, unknown> = {}) {
  return {
    id: 'conv-1',
    businessId: 'biz-1',
    customerId: 'cust-1',
    state: 'IDLE',
    botEnabled: false,
    assignedUserId: 'user-1',
    context: {},
    lastMessageAt: null,
    lastInboundMessageAt: null,
    lastOutboundMessageAt: null,
    unreadCount: 0,
    automationError: null,
    resolvedAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    customer: { id: 'cust-1', name: 'Juan', phone: '5215555555555' },
    assignedUser: null,
    business: { waitingThresholdMinutes: 3 },
    orders: [],
    messages: [],
    ...overrides,
  };
}

function buildService(businessOverrides: Record<string, unknown> = {}) {
  const conversationRow = baseConversationRow();
  const prisma = {
    conversation: {
      findFirst: jest.fn().mockResolvedValue(conversationRow),
      update: jest.fn().mockResolvedValue(conversationRow),
    },
    business: {
      findUniqueOrThrow: jest
        .fn()
        .mockResolvedValue({ reactivateBotOnRelease: false, ...businessOverrides }),
    },
  };
  const realtimeGateway = { emitToBusiness: jest.fn() };
  const service = new ConversationsService(prisma as never, realtimeGateway as never);
  return { service, prisma, realtimeGateway };
}

describe('ConversationsService.releaseControl', () => {
  it('siempre limpia assignedUserId', async () => {
    const { service, prisma } = buildService();
    await service.releaseControl('biz-1', 'conv-1');
    expect(prisma.conversation.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ assignedUserId: null }),
      }),
    );
  });

  it('nunca toca resolvedAt', async () => {
    const { service, prisma } = buildService();
    await service.releaseControl('biz-1', 'conv-1');
    const call = prisma.conversation.update.mock.calls[0][0];
    expect(call.data).not.toHaveProperty('resolvedAt');
  });

  it('no reactiva el bot si el negocio no lo tiene configurado y no se pide explicitamente', async () => {
    const { service, prisma } = buildService({ reactivateBotOnRelease: false });
    await service.releaseControl('biz-1', 'conv-1');
    const call = prisma.conversation.update.mock.calls[0][0];
    expect(call.data).not.toHaveProperty('botEnabled');
  });

  it('reactiva el bot cuando el negocio lo tiene configurado por defecto', async () => {
    const { service, prisma } = buildService({ reactivateBotOnRelease: true });
    await service.releaseControl('biz-1', 'conv-1');
    expect(prisma.conversation.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ botEnabled: true }) }),
    );
  });

  it('reactivateBot=true en la request fuerza reactivar aunque el negocio diga false', async () => {
    const { service, prisma } = buildService({ reactivateBotOnRelease: false });
    await service.releaseControl('biz-1', 'conv-1', true);
    expect(prisma.conversation.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ botEnabled: true }) }),
    );
  });

  it('reactivateBot=false en la request evita reactivar aunque el negocio diga true', async () => {
    const { service, prisma } = buildService({ reactivateBotOnRelease: true });
    await service.releaseControl('biz-1', 'conv-1', false);
    const call = prisma.conversation.update.mock.calls[0][0];
    expect(call.data).not.toHaveProperty('botEnabled');
  });

  it('emite conversation.updated', async () => {
    const { service, realtimeGateway } = buildService();
    await service.releaseControl('biz-1', 'conv-1');
    expect(realtimeGateway.emitToBusiness).toHaveBeenCalledWith(
      'biz-1',
      'conversation.updated',
      expect.objectContaining({ id: 'conv-1' }),
    );
  });
});
