import { Injectable } from '@nestjs/common';
import { ConfigService as NestConfigService } from '@nestjs/config';

export interface AppConfig {
  port: number;
  host: string;
  trustProxy: boolean;
  databaseUrl: string;
  redisUrl: string;
  cacheTtlSeconds: number;
  internalApiToken: string;
  hikerApiBaseUrl: string;
  hikerApiAccessKey: string;
  hikerApiTimeoutMs: number;
  imageProxyAllowedHosts: string[];
  imageProxyTimeoutMs: number;
  imageProxyMaxBytes: number;
  imageProxyCacheSeconds: number;
  rateLimitEnabled: boolean;
  rateLimitMaxRequests: number;
  rateLimitWindowSeconds: number;
  leadsGracePeriodMinutes: number;
  leadsMaxSearchesPerIp: number;
  leadsMaxSearchesPerFingerprint: number;
  leadsEnableGeoEnrichment: boolean;
  leadsGeoTimeoutMs: number;
}

@Injectable()
export class ConfigService {
  constructor(private readonly config: NestConfigService<AppConfig, true>) {}

  get<K extends keyof AppConfig>(key: K): AppConfig[K] {
    return this.config.get(key, { infer: true });
  }
}
