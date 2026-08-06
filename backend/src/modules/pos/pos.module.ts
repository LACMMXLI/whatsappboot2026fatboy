import { Module } from '@nestjs/common';
import { PosService } from './pos.service';
import { PosController } from './pos.controller';
import { POS_PROVIDER } from './pos-provider.interface';
import { LoggingPosProvider } from './logging-pos.provider';
import { OrdersModule } from '../orders/orders.module';
import { MessagesModule } from '../messages/messages.module';
import { RealtimeModule } from '../realtime/realtime.module';

@Module({
  imports: [OrdersModule, MessagesModule, RealtimeModule],
  controllers: [PosController],
  providers: [
    PosService,
    { provide: POS_PROVIDER, useClass: LoggingPosProvider },
  ],
})
export class PosModule {}
