import { Logger } from '@nestjs/common';
import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { BOT_JOBS, BOT_QUEUE, ProcessIncomingMessageJob } from '../../queue/queue.constants';
import { BotEngineService } from './bot-engine.service';
import { ConversationsService } from '../conversations/conversations.service';

@Processor(BOT_QUEUE)
export class BotProcessor extends WorkerHost {
  private readonly logger = new Logger(BotProcessor.name);

  constructor(
    private readonly botEngineService: BotEngineService,
    private readonly conversationsService: ConversationsService,
  ) {
    super();
  }

  async process(job: Job<ProcessIncomingMessageJob>): Promise<void> {
    if (job.name !== BOT_JOBS.PROCESS_INCOMING_MESSAGE) {
      return;
    }
    try {
      await this.botEngineService.handleIncomingMessage(job.data);
      await this.conversationsService.clearAutomationError(job.data.conversationId);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error(
        `Error procesando mensaje entrante (conversation ${job.data.conversationId}): ${message}`,
      );
      await this.conversationsService.setAutomationError(
        job.data.conversationId,
        message,
      );
      throw error;
    }
  }
}
