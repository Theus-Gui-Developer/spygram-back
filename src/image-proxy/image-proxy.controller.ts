import {
  Controller,
  Get,
  Header,
  Logger,
  Options,
  Query,
  Req,
  Res,
  UseInterceptors,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { IsOptional, IsString, MinLength } from 'class-validator';
import { ImageProxyCorsInterceptor } from './image-proxy-cors.interceptor';
import { ImageProxyService } from './image-proxy.service';

class ImageProxyQueryDto {
  @IsString()
  @MinLength(1)
  url!: string;

  @IsOptional()
  @IsString()
  _t?: string;
}

@Controller('api/image-proxy')
@UseInterceptors(ImageProxyCorsInterceptor)
export class ImageProxyController {
  private readonly logger = new Logger(ImageProxyController.name);

  constructor(private readonly imageProxy: ImageProxyService) {}

  @Options()
  @Header('Content-Length', '0')
  preflight(): void {}

  @Get()
  async fetch(
    @Query() query: ImageProxyQueryDto,
    @Res() response: Response,
  ): Promise<void> {
    this.logger.log(`Proxy request: url="${query.url}"`);
    const media = await this.imageProxy.fetch(query.url);
    response.setHeader('Content-Type', media.contentType);
    response.setHeader('Content-Length', media.data.length);
    response.setHeader(
      'Cache-Control',
      `public, max-age=${media.cacheSeconds}`,
    );
    response.send(media.data);
  }
}
