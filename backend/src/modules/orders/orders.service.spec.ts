import { OrdersService } from './orders.service';

function baseOrderRow(overrides: Record<string, unknown> = {}) {
  return {
    id: 'order-1',
    businessId: 'biz-1',
    customerId: 'cust-1',
    conversationId: 'conv-1',
    status: 'CONFIRMED',
    fulfillmentType: 'PICKUP',
    total: 100,
    items: [{ id: 'item-1' }],
    customer: { id: 'cust-1', name: 'Juan' },
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

function buildService(
  orderOverrides: Record<string, unknown> = {},
  businessOverrides: Record<string, unknown> = {},
) {
  const orderRow = baseOrderRow(orderOverrides);
  const prisma = {
    order: {
      findFirst: jest.fn().mockResolvedValue(orderRow),
      findUnique: jest.fn().mockResolvedValue(orderRow),
      update: jest.fn().mockImplementation(({ data }) => ({ ...orderRow, ...data })),
    },
    business: {
      findUnique: jest.fn().mockResolvedValue({ botEnabled: true, ...businessOverrides }),
    },
  };
  const conversationsService = { notifyChanged: jest.fn() };
  const realtimeGateway = { emitToBusiness: jest.fn() };
  const messagesService = { sendOutbound: jest.fn() };
  const service = new OrdersService(
    prisma as never,
    conversationsService as never,
    realtimeGateway as never,
    messagesService as never,
  );
  return { service, prisma, conversationsService, realtimeGateway, messagesService };
}

describe('OrdersService.ready', () => {
  it('marca READY desde CONFIRMED', async () => {
    const { service, prisma } = buildService({ status: 'CONFIRMED' });
    await service.ready('biz-1', 'order-1');
    expect(prisma.order.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ status: 'READY' }) }),
    );
  });

  it('rechaza marcar READY desde DRAFT', async () => {
    const { service } = buildService({ status: 'DRAFT' });
    await expect(service.ready('biz-1', 'order-1')).rejects.toThrow();
  });

  it('notifica al cliente por WhatsApp al marcar listo', async () => {
    const { service, messagesService } = buildService({ status: 'CONFIRMED' });
    await service.ready('biz-1', 'order-1');
    expect(messagesService.sendOutbound).toHaveBeenCalledWith(
      expect.objectContaining({ conversationId: 'conv-1', content: expect.stringContaining('listo') }),
    );
  });
});

describe('OrdersService.deliver', () => {
  it('marca DELIVERED desde READY', async () => {
    const { service, prisma } = buildService({ status: 'READY' });
    await service.deliver('biz-1', 'order-1');
    expect(prisma.order.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ status: 'DELIVERED' }) }),
    );
  });

  it('rechaza marcar DELIVERED desde CONFIRMED (debe pasar por READY primero)', async () => {
    const { service } = buildService({ status: 'CONFIRMED' });
    await expect(service.deliver('biz-1', 'order-1')).rejects.toThrow();
  });
});

describe('OrdersService cambios de estado: efectos centralizados', () => {
  it('siempre emite order.updated en tiempo real', async () => {
    const { service, realtimeGateway } = buildService({ status: 'CONFIRMED' });
    await service.ready('biz-1', 'order-1');
    expect(realtimeGateway.emitToBusiness).toHaveBeenCalledWith(
      'biz-1',
      'order.updated',
      expect.objectContaining({ status: 'READY' }),
    );
  });

  it('refresca la conversacion asociada', async () => {
    const { service, conversationsService } = buildService({ status: 'CONFIRMED' });
    await service.ready('biz-1', 'order-1');
    expect(conversationsService.notifyChanged).toHaveBeenCalledWith('biz-1', 'conv-1');
  });

  it('cancelar no envia notificacion de WhatsApp (no es ready/delivered)', async () => {
    const { service, messagesService } = buildService({ status: 'CONFIRMED' });
    await service.cancel('biz-1', 'order-1');
    expect(messagesService.sendOutbound).not.toHaveBeenCalled();
  });
});

describe('OrdersService: notificaciones respetan el interruptor maestro del bot', () => {
  it('si Business.botEnabled es false, no manda el mensaje de "listo"', async () => {
    const { service, messagesService } = buildService(
      { status: 'CONFIRMED' },
      { botEnabled: false },
    );
    await service.ready('biz-1', 'order-1');
    expect(messagesService.sendOutbound).not.toHaveBeenCalled();
  });

  it('si Business.botEnabled es false, no manda el mensaje de "entregado"', async () => {
    const { service, messagesService } = buildService(
      { status: 'READY' },
      { botEnabled: false },
    );
    await service.deliver('biz-1', 'order-1');
    expect(messagesService.sendOutbound).not.toHaveBeenCalled();
  });

  it('si Business.botEnabled es true, si manda el mensaje', async () => {
    const { service, messagesService } = buildService(
      { status: 'CONFIRMED' },
      { botEnabled: true },
    );
    await service.ready('biz-1', 'order-1');
    expect(messagesService.sendOutbound).toHaveBeenCalled();
  });

  it('apagar el bot no afecta el emit de order.updated (el KDS sigue actualizandose)', async () => {
    const { service, realtimeGateway } = buildService(
      { status: 'CONFIRMED' },
      { botEnabled: false },
    );
    await service.ready('biz-1', 'order-1');
    expect(realtimeGateway.emitToBusiness).toHaveBeenCalledWith(
      'biz-1',
      'order.updated',
      expect.objectContaining({ status: 'READY' }),
    );
  });
});
