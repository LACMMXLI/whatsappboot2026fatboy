import { IntentDetectorService } from './intent-detector.service';
import { Product } from '@prisma/client';

describe('IntentDetectorService custom keywords', () => {
  const service = new IntentDetectorService();
  const emptyCatalog: Product[] = [];

  it('detecta view_menu con una palabra clave propia del negocio', () => {
    const result = service.detect('que tienen para hoy', emptyCatalog, 'IDLE', {
      view_menu: ['que tienen'],
    });
    expect(result.intent).toBe('view_menu');
  });

  it('sin la palabra clave custom, el mismo mensaje no matchea view_menu', () => {
    const result = service.detect('que tienen para hoy', emptyCatalog, 'IDLE', {});
    expect(result.intent).not.toBe('view_menu');
  });

  it('las reglas por defecto siguen funcionando sin custom keywords', () => {
    const result = service.detect('hola buenas', emptyCatalog, 'IDLE');
    expect(result.intent).toBe('greeting');
  });

  it('una palabra clave custom de cancel tiene la misma prioridad que el default', () => {
    const result = service.detect('mejor dejalo asi', emptyCatalog, 'BUILDING_ORDER', {
      cancel: ['dejalo asi'],
    });
    expect(result.intent).toBe('cancel');
  });
});

describe('IntentDetectorService flujo guiado', () => {
  const service = new IntentDetectorService();
  const emptyCatalog: Product[] = [];

  it('en ASKING_NAME cualquier texto se toma como el nombre del cliente', () => {
    const result = service.detect('Ana Lopez', emptyCatalog, 'ASKING_NAME', {});
    expect(result.intent).toBe('provide_name');
    expect(result.customerName).toBe('Ana Lopez');
  });

  it('en ASKING_NAME pedir un humano sigue teniendo prioridad', () => {
    const result = service.detect('quiero hablar con un agente', emptyCatalog, 'ASKING_NAME', {});
    expect(result.intent).toBe('talk_to_human');
  });

  it('en ASKING_PROMOTIONS "si" se detecta como affirm', () => {
    const result = service.detect('si porfavor', emptyCatalog, 'ASKING_PROMOTIONS', {});
    expect(result.intent).toBe('affirm');
  });

  it('en ASKING_PROMOTIONS "no" se detecta como deny', () => {
    const result = service.detect('no gracias', emptyCatalog, 'ASKING_PROMOTIONS', {});
    expect(result.intent).toBe('deny');
  });

  it('en BROWSING_CATEGORIES se puede elegir la categoria por nombre', () => {
    const result = service.detect(
      'hamburguesas',
      emptyCatalog,
      'BROWSING_CATEGORIES',
      {},
      [],
      ['Hamburguesas', 'Bebidas'],
    );
    expect(result.intent).toBe('select_category');
    expect(result.selectedCategory).toBe('Hamburguesas');
  });

  it('en BROWSING_CATEGORIES se puede elegir la categoria por numero de lista', () => {
    const result = service.detect(
      '2',
      emptyCatalog,
      'BROWSING_CATEGORIES',
      {},
      [],
      ['Hamburguesas', 'Bebidas'],
    );
    expect(result.selectedCategory).toBe('Bebidas');
  });

  it('en BROWSING_PROMOTIONS se puede elegir la promo por numero', () => {
    const promo = { id: 'p1', title: 'Promo del dia', price: 150 } as never;
    const result = service.detect(
      '1',
      emptyCatalog,
      'BROWSING_PROMOTIONS',
      {},
      [promo],
    );
    expect(result.intent).toBe('select_promotion');
    expect(result.matchedPromotions[0].promotion).toBe(promo);
  });
});
