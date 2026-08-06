import { Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import {
  OnGatewayConnection,
  OnGatewayDisconnect,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { JwtPayload } from '../auth/strategies/jwt.strategy';
import { parseCorsOrigins } from '../../config/cors';

/**
 * Gateway de tiempo real. Cada cliente se autentica con el mismo JWT usado
 * en las APIs REST (via handshake.auth.token) y se une a una room por
 * businessId, de forma que los eventos quedan aislados por negocio (multi-tenant).
 *
 * El CORS del gateway se decide con el mismo CORS_ORIGINS que las APIs REST
 * (ver src/config/cors.ts). Se lee de process.env directamente porque el
 * decorador se evalua al cargar la clase, antes de que exista ConfigService.
 */
@WebSocketGateway({
  namespace: '/realtime',
  cors: { origin: parseCorsOrigins(), credentials: true },
})
export class RealtimeGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(RealtimeGateway.name);

  constructor(private readonly jwtService: JwtService) {}

  handleConnection(client: Socket): void {
    try {
      const token =
        (client.handshake.auth?.token as string | undefined) ??
        (client.handshake.headers?.authorization as string | undefined)?.replace(
          'Bearer ',
          '',
        );
      if (!token) {
        throw new Error('Token no proporcionado');
      }
      const payload = this.jwtService.verify<JwtPayload>(token);
      client.data.businessId = payload.businessId;
      client.join(this.roomFor(payload.businessId));
      this.logger.log(`Cliente conectado a negocio ${payload.businessId}`);
    } catch (error) {
      this.logger.warn(
        `Conexion WebSocket rechazada: ${error instanceof Error ? error.message : String(error)}`,
      );
      client.disconnect(true);
    }
  }

  handleDisconnect(client: Socket): void {
    this.logger.log(`Cliente desconectado: ${client.id}`);
  }

  private roomFor(businessId: string): string {
    return `business:${businessId}`;
  }

  emitToBusiness(businessId: string, event: string, payload: unknown): void {
    this.server?.to(this.roomFor(businessId)).emit(event, payload);
  }
}
