import { Global, Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { ConfigModule, ConfigService } from '@nestjs/config';

/**
 * Configura la conexion compartida de BullMQ/Redis para toda la app.
 * Los modulos que necesiten una cola concreta usan BullModule.registerQueue
 * y reutilizan esta conexion (no hace falta reconfigurarla).
 */
@Global()
@Module({
  imports: [
    BullModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        connection: {
          host: configService.get<string>('redis.host'),
          port: configService.get<number>('redis.port'),
          password: configService.get<string>('redis.password'),
          tls: configService.get('redis.tls'),
        },
      }),
    }),
  ],
  exports: [BullModule],
})
export class BullmqModule {}
