import { Module } from '@nestjs/common';
import { LeadsAccessPolicyService } from './leads-access-policy.service';
import { LeadsController } from './leads.controller';
import { LeadsService } from './leads.service';

@Module({
  controllers: [LeadsController],
  providers: [LeadsService, LeadsAccessPolicyService],
  exports: [LeadsService, LeadsAccessPolicyService],
})
export class LeadsModule {}
