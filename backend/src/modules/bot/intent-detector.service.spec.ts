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
