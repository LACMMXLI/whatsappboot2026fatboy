import { ResponseGeneratorService, ResponseContext } from './response-generator.service';

function baseCtx(overrides: Partial<ResponseContext> = {}): ResponseContext {
  return {
    intent: 'greeting',
    previousState: 'IDLE',
    nextState: 'IDLE',
    matchedProducts: [],
    catalog: [],
    activePromotions: [],
    cart: null,
    businessName: 'Sushi Roll',
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
});
