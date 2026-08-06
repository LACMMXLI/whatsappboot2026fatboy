import { ResponseGeneratorService, ResponseContext } from './response-generator.service';

function baseCtx(overrides: Partial<ResponseContext> = {}): ResponseContext {
  return {
    intent: 'greeting',
    previousState: 'IDLE',
    nextState: 'IDLE',
    matchedProducts: [],
    matchedPromotions: [],
    catalog: [],
    activePromotions: [],
    categories: [],
    selectedCategory: null,
    cart: null,
    businessName: 'Sushi Roll',
    pickupAddress: null,
    customerName: null,
    ...overrides,
  };
}

describe('ResponseGeneratorService templates', () => {
  const service = new ResponseGeneratorService();

  it('usa el texto por defecto cuando no hay override', () => {
    const text = service.generate(baseCtx());
    expect(text).toContain('Hola! Bienvenido a Sushi Roll.');
  });

  it('usa el override del negocio cuando existe, sustituyendo {businessName}', () => {
    const text = service.generate(
      baseCtx({ templates: { GREETING: 'Que onda! Bienvenido a {businessName} 🌮' } }),
    );
    expect(text).toContain('Que onda! Bienvenido a Sushi Roll 🌮');
    expect(text).not.toContain('Hola! Bienvenido a Sushi Roll.');
  });

  it('el override de FALLBACK se usa en la respuesta de intencion desconocida', () => {
    const text = service.generate(
      baseCtx({
        intent: 'unknown',
        catalog: [{ id: '1', active: true } as never],
        templates: { FALLBACK: 'No te entendi, che.' },
      }),
    );
    expect(text).toContain('No te entendi, che.');
  });

  it('HUMAN_HANDOFF con override no agrega el hint de menu (mensaje autocontenido)', () => {
    const text = service.generate(
      baseCtx({ intent: 'talk_to_human', templates: { HUMAN_HANDOFF: 'Ya te conecto con alguien.' } }),
    );
    expect(text).toBe('Ya te conecto con alguien.');
  });

  it('provide_name saluda por nombre y sigue con el siguiente paso guiado', () => {
    const text = service.generate(
      baseCtx({ intent: 'provide_name', nextState: 'BROWSING_CATEGORIES', customerName: 'Ana' }),
    );
    expect(text).toContain('Mucho gusto, Ana!');
    expect(text).toContain('Todavia no tenemos productos');
  });

  it('ASKING_PROMOTIONS pregunta antes de mostrar el menu completo', () => {
    const text = service.generate(baseCtx({ intent: 'affirm', nextState: 'BROWSING_PROMOTIONS' }));
    expect(text).toContain('No tenemos promociones activas');
  });

  it('BROWSING_CATEGORIES nunca vuelca todos los productos de golpe, solo categorias', () => {
    const text = service.generate(
      baseCtx({
        intent: 'select_category',
        nextState: 'BROWSING_CATEGORIES',
        categories: ['Hamburguesas', 'Bebidas'],
      }),
    );
    expect(text).toContain('1. Hamburguesas');
    expect(text).toContain('2. Bebidas');
  });

  it('la confirmacion final incluye la direccion de recoleccion y el nombre del cliente', () => {
    const text = service.generate(
      baseCtx({
        intent: 'confirm',
        nextState: 'ORDER_CREATED',
        pickupAddress: 'Av. Reforma 123',
        customerName: 'Ana',
        cart: { total: 150 } as never,
      }),
    );
    expect(text).toContain('Av. Reforma 123');
    expect(text).toContain('Ana');
  });
});
