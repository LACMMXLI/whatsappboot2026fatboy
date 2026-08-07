import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';
import helmet from 'helmet';
import { AppModule } from './app.module';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const configService = app.get(ConfigService);

  // Headers de seguridad HTTP (X-Frame-Options, X-Content-Type-Options, HSTS, etc.).
  // CSP desactivada porque este proceso tambien sirve la UI de Swagger (/docs),
  // que carga scripts/estilos inline incompatibles con la CSP por defecto de helmet.
  app.use(
    helmet({
      contentSecurityPolicy: false,
    }),
  );

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    }),
  );
  app.useGlobalFilters(new HttpExceptionFilter());
  // CORS_ORIGINS (lista separada por comas) restringe el CRM permitido en
  // produccion; sin configurar, permite cualquier origen (solo pensado para
  // desarrollo local). Ver src/config/configuration.ts.
  app.enableCors({
    origin: configService.get<string[] | true>('corsOrigins'),
    credentials: true,
  });

  const swaggerConfig = new DocumentBuilder()
    .setTitle('WhatsApp Orders Backend API')
    .setDescription(
      'API para automatizacion de pedidos por WhatsApp para restaurantes (SaaS multi-negocio). ' +
        'Incluye WhatsApp webhook, motor de bot, CRM de conversaciones, catalogo de productos, ' +
        'promociones, pedidos, integracion POS y eventos en tiempo real.',
    )
    .setVersion('0.1.0')
    .addBearerAuth()
    .addTag('auth', 'Login')
    .addTag('superadmin', 'Panel del dueño de la plataforma: alta de negocios (tenants) y su WhatsApp')
    .addTag('users', 'Usuarios del negocio')
    .addTag('businesses', 'Negocio (tenant) y su configuracion')
    .addTag('whatsapp', 'Webhook e integracion con Evolution API')
    .addTag('conversations', 'Conversaciones tipo CRM')
    .addTag('messages', 'Mensajes de cada conversacion')
    .addTag('products', 'Catalogo dinamico de productos')
    .addTag('promotions', 'Promociones dinamicas')
    .addTag('orders', 'Pedidos (carrito y confirmados)')
    .addTag('customers', 'Clientes finales')
    .addTag('pos', 'Integracion con POS')
    .addTag('bot-config', 'Textos y palabras clave personalizables del bot')
    .build();
  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('docs', app, document);

  const port = configService.get<number>('port') ?? 3000;
  await app.listen(port);
  Logger.log(`Application running on http://localhost:${port}`);
  Logger.log(`Swagger docs available at http://localhost:${port}/docs`);
}
bootstrap();
