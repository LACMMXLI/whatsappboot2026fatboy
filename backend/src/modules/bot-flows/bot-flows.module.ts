import { Module } from '@nestjs/common';
import { BotFlowsService } from './bot-flows.service';
import { BotFlowsController } from './bot-flows.controller';

@Module({
  controllers: [BotFlowsController],
  providers: [BotFlowsService],
  exports: [BotFlowsService],
})
export class BotFlowsModule {}
