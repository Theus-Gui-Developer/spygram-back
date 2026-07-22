import { Module } from '@nestjs/common';
import { AllowedOriginsModule } from '../allowed-origins/allowed-origins.module';
import { InstagramModule } from '../instagram/instagram.module';
import { AdminAllowedOriginsController } from './admin-allowed-origins.controller';
import { AdminLeadsController } from './admin-leads.controller';
import { AdminMetricsController } from './admin-metrics.controller';
import { AdminSearchLogsController } from './admin-search-logs.controller';

@Module({
  imports: [InstagramModule, AllowedOriginsModule],
  controllers: [
    AdminAllowedOriginsController,
    AdminLeadsController,
    AdminMetricsController,
    AdminSearchLogsController,
  ],
})
export class AdminModule {}
