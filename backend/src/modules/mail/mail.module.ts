import { Global, Module } from '@nestjs/common';
import { MailService } from './mail.service';

/** Global: cualquier modulo puede inyectar MailService sin reimportar. */
@Global()
@Module({
  providers: [MailService],
  exports: [MailService],
})
export class MailModule {}
