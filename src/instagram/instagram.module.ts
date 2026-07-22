import { Module } from '@nestjs/common';
import { LeadsModule } from '../leads/leads.module';
import { InstagramController } from './instagram.controller';
import { InstagramService } from './instagram.service';
import { HikerApiProvider } from './providers/hikerapi-provider.service';
import { INSTAGRAM_PROVIDER } from './providers/instagram-provider.interface';

@Module({
  imports: [LeadsModule],
  controllers: [InstagramController],
  providers: [
    InstagramService,
    HikerApiProvider,
    { provide: INSTAGRAM_PROVIDER, useExisting: HikerApiProvider },
  ],
  exports: [InstagramService, HikerApiProvider, INSTAGRAM_PROVIDER],
})
export class InstagramModule {}
