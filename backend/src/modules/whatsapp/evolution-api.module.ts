import { Module } from '@nestjs/common';
import { EvolutionApiService } from './evolution-api.service';
import { EvolutionAdminService } from './evolution-admin.service';

@Module({
  providers: [EvolutionApiService, EvolutionAdminService],
  exports: [EvolutionApiService, EvolutionAdminService],
})
export class EvolutionApiModule {}
