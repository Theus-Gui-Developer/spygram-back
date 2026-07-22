import { CACHE_MANAGER } from '@nestjs/cache-manager';
import {
  BadGatewayException,
  BadRequestException,
  ForbiddenException,
  GatewayTimeoutException,
  HttpException,
  Inject,
  Injectable,
  PayloadTooLargeException,
} from '@nestjs/common';
import axios, { AxiosError } from 'axios';
import { Cache } from 'cache-manager';
import { createHash } from 'node:crypto';
import { ConfigService } from '../config/config.service';

export interface ProxiedMedia {
  data: Buffer;
  contentType: string;
  cacheSeconds: number;
}

interface CachedMedia {
  data: string;
  contentType: string;
}

@Injectable()
export class ImageProxyService {
  constructor(
    private readonly config: ConfigService,
    @Inject(CACHE_MANAGER) private readonly cache: Cache,
  ) {}

  async fetch(rawUrl: string): Promise<ProxiedMedia> {
    let current = this.validateUrl(rawUrl);
    const key = `image-proxy:${createHash('sha256').update(current.href).digest('hex')}`;
    const cached = await this.cache.get<CachedMedia>(key);
    const cacheSeconds = this.config.get('imageProxyCacheSeconds');
    if (cached) {
      return {
        data: Buffer.from(cached.data, 'base64'),
        contentType: cached.contentType,
        cacheSeconds,
      };
    }

    try {
      for (let redirects = 0; redirects <= 4; redirects += 1) {
        const response = await axios.get<ArrayBuffer>(current.href, {
          responseType: 'arraybuffer',
          timeout: this.config.get('imageProxyTimeoutMs'),
          maxRedirects: 0,
          maxContentLength: this.config.get('imageProxyMaxBytes'),
          maxBodyLength: this.config.get('imageProxyMaxBytes'),
          validateStatus: () => true,
          headers: {
            Accept: 'image/avif,image/webp,image/*,video/*;q=0.8,*/*;q=0.5',
            Referer: 'https://www.instagram.com/',
            'User-Agent':
              'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/126 Safari/537.36',
          },
        });

        if (response.status >= 300 && response.status < 400) {
          const location = response.headers.location as string | undefined;
          if (!location || redirects === 4)
            throw new BadGatewayException('Invalid upstream redirect');
          current = this.validateUrl(new URL(location, current).href);
          continue;
        }
        if (response.status < 200 || response.status >= 300) {
          throw new BadGatewayException(
            `Upstream returned status ${response.status}`,
          );
        }

        const contentType = String(response.headers['content-type'] ?? '')
          .split(';')[0]
          .trim()
          .toLowerCase();
        if (
          !contentType.startsWith('image/') &&
          !contentType.startsWith('video/')
        ) {
          throw new BadGatewayException('Upstream content is not media');
        }
        const data = Buffer.from(response.data);
        if (data.length > this.config.get('imageProxyMaxBytes'))
          throw new PayloadTooLargeException();
        await this.cache.set(
          key,
          { data: data.toString('base64'), contentType },
          cacheSeconds * 1000,
        );
        return { data, contentType, cacheSeconds };
      }
    } catch (error) {
      if (error instanceof HttpException) throw error;
      if (error instanceof AxiosError && error.code === 'ECONNABORTED') {
        throw new GatewayTimeoutException('Image proxy request timed out');
      }
      if (
        error instanceof AxiosError &&
        (error.message.includes('maxContentLength') ||
          error.code === 'ERR_FR_MAX_BODY_LENGTH_EXCEEDED')
      ) {
        throw new PayloadTooLargeException('Upstream media is too large');
      }
      throw new BadGatewayException('Unable to fetch upstream media');
    }
    throw new BadGatewayException('Unable to fetch upstream media');
  }

  private validateUrl(value: string): URL {
    let url: URL;
    try {
      url = new URL(value);
    } catch {
      throw new BadRequestException('Invalid URL');
    }
    if (
      url.protocol !== 'https:' ||
      url.username ||
      url.password ||
      (url.port && url.port !== '443')
    ) {
      throw new BadRequestException(
        'Only credential-free HTTPS URLs on port 443 are supported',
      );
    }
    const hostname = url.hostname.toLowerCase().replace(/\.$/, '');
    const allowed = this.config
      .get('imageProxyAllowedHosts')
      .some((host) => hostname === host || hostname.endsWith(`.${host}`));
    if (!allowed) throw new ForbiddenException('Host is not allowed');
    return url;
  }
}
