import { Global, Module } from '@nestjs/common';
import { ConfigModule as NestConfigModule } from '@nestjs/config';
import { AppConfig, ConfigService } from './config.service';

function required(env: Record<string, unknown>, key: string): string {
  const value = String(env[key] ?? '').trim();
  if (!value) throw new Error(`${key} is required`);
  return value;
}

function integer(
  env: Record<string, unknown>,
  key: string,
  fallback: number,
  minimum = 0,
): number {
  const value = Number(env[key] ?? fallback);
  if (!Number.isInteger(value) || value < minimum) {
    throw new Error(
      `${key} must be an integer greater than or equal to ${minimum}`,
    );
  }
  return value;
}

function boolean(
  env: Record<string, unknown>,
  key: string,
  fallback: boolean,
): boolean {
  const value = String(env[key] ?? fallback).toLowerCase();
  if (!['true', 'false'].includes(value))
    throw new Error(`${key} must be true or false`);
  return value === 'true';
}

function csv(env: Record<string, unknown>, key: string): string[] {
  const values = required(env, key)
    .split(',')
    .map((value) => value.trim().toLowerCase())
    .filter(Boolean);
  if (!values.length) throw new Error(`${key} must contain at least one value`);
  return values;
}

function validate(env: Record<string, unknown>): AppConfig {
  return {
    port: integer(env, 'PORT', 3001, 1),
    host: required(env, 'HOST'),
    trustProxy: boolean(env, 'TRUST_PROXY', false),
    databaseUrl: required(env, 'DATABASE_URL'),
    redisUrl: required(env, 'REDIS_URL'),
    cacheTtlSeconds: integer(env, 'CACHE_TTL_SECONDS', 300, 1),
    internalApiToken: required(env, 'INTERNAL_API_TOKEN'),
    hikerApiBaseUrl: required(env, 'HIKERAPI_BASE_URL').replace(/\/$/, ''),
    hikerApiAccessKey: required(env, 'HIKERAPI_ACCESS_KEY'),
    hikerApiTimeoutMs: integer(env, 'HIKERAPI_TIMEOUT_MS', 15000, 1),
    imageProxyAllowedHosts: csv(env, 'IMAGE_PROXY_ALLOWED_HOSTS'),
    imageProxyTimeoutMs: integer(env, 'IMAGE_PROXY_TIMEOUT_MS', 5000, 1),
    imageProxyMaxBytes: integer(env, 'IMAGE_PROXY_MAX_BYTES', 25_000_000, 1),
    imageProxyCacheSeconds: integer(env, 'IMAGE_PROXY_CACHE_SECONDS', 300, 1),
    rateLimitEnabled: boolean(env, 'RATE_LIMIT_ENABLED', true),
    rateLimitMaxRequests: integer(env, 'RATE_LIMIT_MAX_REQUESTS', 120, 1),
    rateLimitWindowSeconds: integer(env, 'RATE_LIMIT_WINDOW_SECONDS', 60, 1),
    leadsGracePeriodMinutes: integer(env, 'LEADS_GRACE_PERIOD_MINUTES', 15, 0),
    leadsMaxSearchesPerIp: integer(env, 'LEADS_MAX_SEARCHES_PER_IP', 1, 1),
    leadsMaxSearchesPerFingerprint: integer(
      env,
      'LEADS_MAX_SEARCHES_PER_FINGERPRINT',
      1,
      1,
    ),
    leadsEnableGeoEnrichment: boolean(
      env,
      'LEADS_ENABLE_GEO_ENRICHMENT',
      false,
    ),
    leadsGeoTimeoutMs: integer(env, 'LEADS_GEO_TIMEOUT_MS', 4000, 1),
  };
}

@Global()
@Module({
  imports: [
    NestConfigModule.forRoot({ isGlobal: true, cache: true, validate }),
  ],
  providers: [ConfigService],
  exports: [ConfigService],
})
export class AppConfigModule {}
