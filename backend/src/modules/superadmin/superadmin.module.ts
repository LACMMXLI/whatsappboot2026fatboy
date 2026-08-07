import { Module } from '@nestjs/common';
import { SuperAdminService } from './superadmin.service';
import { SuperAdminController } from './superadmin.controller';
import { UsersModule } from '../users/users.module';
import { EvolutionApiModule } from '../whatsapp/evolution-api.module';

@Module({
  imports: [UsersModule, EvolutionApiModule],
  providers: [SuperAdminService],
  controllers: [SuperAdminController],
})
export class SuperAdminModule {}
