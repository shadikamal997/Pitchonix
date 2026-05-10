import { Module, Global } from '@nestjs/common';
import { EmailService } from './email.service';
import { EmailDigestService } from './email-digest.service';

@Global()
@Module({
  providers: [EmailService, EmailDigestService],
  exports: [EmailService],
})
export class EmailModule {}
