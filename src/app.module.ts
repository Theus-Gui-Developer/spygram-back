import { CacheModule } from '@nestjs/cache-manager';
import { Module } from '@nestjs/common';
import { APP_FILTER, APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { redisStore } from 'cache-manager-redis-yet';
import { AdminModule } from './admin/admin.module';
import { AllowedOriginsModule } from './allowed-origins/allowed-origins.module';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { InternalTokenGuard } from './common/guards/internal-token.guard';
import { RateLimitInterceptor } from './common/interceptors/rate-limit.interceptor';
import { AppConfigModule } from './config/config.module';
import { ConfigService } from './config/config.service';
import { HealthModule } from './health/health.module';
import { AuthModule } from './auth/auth.module';
import { ImageProxyModule } from './image-proxy/image-proxy.module';
import { InstagramModule } from './instagram/instagram.module';
import { LeadsModule } from './leads/leads.module';
import { PrismaModule } from './prisma/prisma.module';

@Module({
  imports: [
    AppConfigModule,
    CacheModule.registerAsync({
      isGlobal: true,
      inject: [ConfigService],
      useFactory: async (config: ConfigService) => ({
        store: await redisStore({ url: config.get('redisUrl') }),
        ttl: config.get('cacheTtlSeconds') * 1000,
      }),
    }),
    PrismaModule,
    AuthModule,
    LeadsModule,
    InstagramModule,
    ImageProxyModule,
    AllowedOriginsModule,
    AdminModule,
    HealthModule,
  ],
  providers: [
    { provide: APP_GUARD, useClass: InternalTokenGuard },
    { provide: APP_INTERCEPTOR, useClass: RateLimitInterceptor },
    { provide: APP_FILTER, useClass: HttpExceptionFilter },
  ],
})
export class AppModule {}
