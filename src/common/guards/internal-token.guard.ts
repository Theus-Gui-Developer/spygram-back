import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { timingSafeEqual } from 'node:crypto';
import { Request } from 'express';
import { ConfigService } from '../../config/config.service';

@Injectable()
export class InternalTokenGuard implements CanActivate {
  constructor(private readonly config: ConfigService) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<Request>();
    if (!request.path.startsWith('/internal/')) return true;

    const supplied = request.header('x-internal-token') ?? '';
    const expected = this.config.get('internalApiToken');
    const valid =
      supplied.length === expected.length &&
      timingSafeEqual(Buffer.from(supplied), Buffer.from(expected));
    if (!valid) throw new UnauthorizedException('Invalid internal API token');
    return true;
  }
}
