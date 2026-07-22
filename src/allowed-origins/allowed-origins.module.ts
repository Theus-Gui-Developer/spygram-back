import { Module } from '@nestjs/common';
import { AllowedOriginsService } from './allowed-origins.service';

@Module({
  providers: [AllowedOriginsService],
  exports: [AllowedOriginsService],
})
export class AllowedOriginsModule {}
