import {
  CallHandler,
  ExecutionContext,
  HttpException,
  HttpStatus,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { Observable } from 'rxjs';
import { ConfigService } from '../../config/config.service';

interface RateWindow {
  timestamps: number[];
  touchedAt: number;
}

@Injectable()
export class RateLimitInterceptor implements NestInterceptor {
  private readonly windows = new Map<string, RateWindow>();
  private requestsSinceCleanup = 0;

  constructor(private readonly config: ConfigService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const request = context.switchToHttp().getRequest<Request>();
    const response = context.switchToHttp().getResponse<Response>();
    if (
      !this.config.get('rateLimitEnabled') ||
      request.path === '/health' ||
      request.path.startsWith('/internal/')
    ) {
      return next.handle();
    }

    const now = Date.now();
    const windowMs = this.config.get('rateLimitWindowSeconds') * 1000;
    const limit = this.config.get('rateLimitMaxRequests');
    const key = request.ip || request.socket.remoteAddress || 'unknown';
    const existing = this.windows.get(key) ?? {
      timestamps: [],
      touchedAt: now,
    };
    existing.timestamps = existing.timestamps.filter(
      (timestamp) => timestamp > now - windowMs,
    );
    existing.touchedAt = now;
    const resetAt = existing.timestamps[0]
      ? existing.timestamps[0] + windowMs
      : now + windowMs;

    response.setHeader('X-RateLimit-Limit', limit);
    response.setHeader(
      'X-RateLimit-Remaining',
      Math.max(0, limit - existing.timestamps.length - 1),
    );
    response.setHeader('X-RateLimit-Reset', Math.ceil(resetAt / 1000));
    if (existing.timestamps.length >= limit) {
      this.windows.set(key, existing);
      throw new HttpException(
        'Rate limit exceeded',
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }
    existing.timestamps.push(now);
    this.windows.set(key, existing);
    this.cleanup(now, windowMs);
    return next.handle();
  }

  private cleanup(now: number, windowMs: number): void {
    this.requestsSinceCleanup += 1;
    if (this.requestsSinceCleanup < 500) return;
    this.requestsSinceCleanup = 0;
    for (const [key, value] of this.windows) {
      if (value.touchedAt < now - windowMs) this.windows.delete(key);
    }
  }
}
