import { Module } from '@nestjs/common';
import { BotResponseTemplatesService } from './bot-response-templates.service';
import { BotKeywordRulesService } from './bot-keyword-rules.service';
import { BotConfigController } from './bot-config.controller';

@Module({
  controllers: [BotConfigController],
  providers: [BotResponseTemplatesService, BotKeywordRulesService],
  exports: [BotResponseTemplatesService, BotKeywordRulesService],
})
export class BotConfigModule {}
