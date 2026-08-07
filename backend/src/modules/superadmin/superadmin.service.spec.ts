import { SuperAdminService } from './superadmin.service';

function buildService(overrides: { evolutionFails?: boolean } = {}) {
  const businessRow = {
    id: 'biz-new',
    name: 'Sushi Roll',
    whatsappInstanceId: null as string | null,
    whatsappConnectionStatus: 'PENDING',
    whatsappConnectionError: null as string | null,
  };

  const prisma = {
    business: {
      create: jest.fn().mockResolvedValue(businessRow),
      findUnique: jest.fn().mockImplementation(() => Promise.resolve(businessRow)),
      findUniqueOrThrow: jest.fn().mockImplementation(() => Promise.resolve(businessRow)),
      update: jest.fn().mockImplementation(({ data }) => {
        Object.assign(businessRow, data);
        return Promise.resolve(businessRow);
      }),
    },
  };

  const usersService = {
    findByEmail: jest.fn().mockResolvedValue(null),
    createWithPassword: jest.fn().mockResolvedValue({
      id: 'user-1',
      email: 'owner@sushiroll.com',
      name: 'Juan',
      role: 'ADMIN',
      passwordHash: 'hash',
    }),
  };

  const evolutionAdmin = {
    createInstance: overrides.evolutionFails
      ? jest.fn().mockRejectedValue(new Error('Evolution API no disponible'))
      : jest.fn().mockResolvedValue({ qrCode: { base64: 'data:image/png;base64,xxx' } }),
    setWebhook: jest.fn().mockResolvedValue(undefined),
    getQrCode: jest.fn(),
    getConnectionState: jest.fn(),
    logout: jest.fn(),
    restart: jest.fn(),
    deleteInstance: jest.fn(),
  };

  const configService = {
    get: jest.fn((key: string) => {
      if (key === 'appUrl') return 'https://apicrm.example.com';
      if (key === 'whatsapp.webhookSecret') return 'secret';
      return undefined;
    }),
  };

  const service = new SuperAdminService(
    prisma as never,
    usersService as never,
    evolutionAdmin as never,
    configService as never,
  );

  return { service, prisma, usersService, evolutionAdmin, businessRow };
}

describe('SuperAdminService.createBusiness', () => {
  it('crea el negocio y el admin, y conecta WhatsApp si Evolution responde bien', async () => {
    const { service, usersService } = buildService();
    const result = await service.createBusiness({
      businessName: 'Sushi Roll',
      adminName: 'Juan',
      adminEmail: 'owner@sushiroll.com',
      adminPassword: 'S3curePassword!',
    });
    expect(usersService.createWithPassword).toHaveBeenCalledWith(
      'biz-new',
      expect.objectContaining({ role: 'ADMIN' }),
    );
    expect(result.qrCode).toBeDefined();
  });

  it('NUNCA pierde el alta del tenant si Evolution API no responde: queda en ERROR, no lanza', async () => {
    const { service, businessRow } = buildService({ evolutionFails: true });
    const result = await service.createBusiness({
      businessName: 'Sushi Roll',
      adminName: 'Juan',
      adminEmail: 'owner@sushiroll.com',
      adminPassword: 'S3curePassword!',
    });
    expect(businessRow.whatsappConnectionStatus).toBe('ERROR');
    expect(businessRow.whatsappConnectionError).toContain('Evolution API');
    expect(result.business).toBeDefined();
    expect(result.admin).toBeDefined();
  });

  it('no crea el negocio si el email del admin ya existe', async () => {
    const { service, usersService, prisma } = buildService();
    usersService.findByEmail.mockResolvedValueOnce({ id: 'existing' });
    await expect(
      service.createBusiness({
        businessName: 'Sushi Roll',
        adminName: 'Juan',
        adminEmail: 'owner@sushiroll.com',
        adminPassword: 'S3curePassword!',
      }),
    ).rejects.toThrow();
    expect(prisma.business.create).not.toHaveBeenCalled();
  });
});
