import { MessageSenderType } from '@prisma/client';
import { MessagesService } from './messages.service';

function buildService() {
  const prisma = {
    conversation: {
      findFirst: jest.fn().mockResolvedValue({
        id: 'conv-1',
        businessId: 'biz-1',
        customer: { phone: '5215555555555' },
        business: { whatsappInstanceId: 'instance-biz-1' },
      }),
    },
    message: {
      create: jest.fn().mockImplementation(({ data }) => ({ id: 'msg-1', ...data })),
    },
  };
  const evolutionApiService = { sendMessage: jest.fn().mockResolvedValue(undefined) };
  const conversationsService = {
    recordOutboundMessage: jest.fn().mockResolvedValue(undefined),
    recordInboundMessage: jest.fn().mockResolvedValue(undefined),
  };
  const realtimeGateway = { emitToBusiness: jest.fn() };

  const service = new MessagesService(
    prisma as never,
    evolutionApiService as never,
    conversationsService as never,
    realtimeGateway as never,
  );

  return { service, prisma, evolutionApiService, conversationsService, realtimeGateway };
}

describe('MessagesService.sendOutbound', () => {
  const baseParams = {
    businessId: 'biz-1',
    conversationId: 'conv-1',
    content: 'hola',
  };

  it.each([
    MessageSenderType.BOT,
    MessageSenderType.AGENT,
    MessageSenderType.INTEGRATION,
  ])('despacha a WhatsApp y cuenta como respuesta cuando senderType=%s', async (senderType) => {
    const { service, evolutionApiService, conversationsService } = buildService();

    await service.sendOutbound({ ...baseParams, senderType });

    expect(evolutionApiService.sendMessage).toHaveBeenCalledWith(
      'instance-biz-1',
      '5215555555555',
      'hola',
    );
    expect(conversationsService.recordOutboundMessage).toHaveBeenCalledWith('conv-1');
  });

  it('NO despacha a WhatsApp ni cuenta como respuesta cuando senderType=SYSTEM', async () => {
    const { service, evolutionApiService, conversationsService, realtimeGateway } =
      buildService();

    const message = await service.sendOutbound({
      ...baseParams,
      senderType: MessageSenderType.SYSTEM,
    });

    expect(evolutionApiService.sendMessage).not.toHaveBeenCalled();
    expect(conversationsService.recordOutboundMessage).not.toHaveBeenCalled();
    // Igual se persiste y se emite por socket (visible en el timeline del CRM).
    expect(message.senderType).toBe(MessageSenderType.SYSTEM);
    expect(realtimeGateway.emitToBusiness).toHaveBeenCalledWith(
      'biz-1',
      'message.new',
      expect.objectContaining({ senderType: MessageSenderType.SYSTEM }),
    );
  });

  it('fuerza senderType=AGENT con senderUserId/senderNameSnapshot cuando se proveen', async () => {
    const { service, prisma } = buildService();

    await service.sendOutbound({
      ...baseParams,
      senderType: MessageSenderType.AGENT,
      senderUserId: 'user-1',
      senderNameSnapshot: 'Maria',
    });

    expect(prisma.message.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          senderType: MessageSenderType.AGENT,
          senderUserId: 'user-1',
          senderNameSnapshot: 'Maria',
        }),
      }),
    );
  });
});
