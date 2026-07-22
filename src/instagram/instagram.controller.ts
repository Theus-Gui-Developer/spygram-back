import { Controller, Get, Query, Req } from '@nestjs/common';
import { Request } from 'express';
import { BuscaCompletaDto } from './dto/busca-completa.dto';
import { InstagramPostDto } from './dto/instagram-post.dto';
import { InstagramProfileDto } from './dto/instagram-profile.dto';
import { InstagramQueryDto } from './dto/instagram-query.dto';
import { InstagramService } from './instagram.service';

@Controller('api/instagram')
export class InstagramController {
  constructor(private readonly instagram: InstagramService) {}

  @Get()
  fetch(
    @Query() query: InstagramQueryDto,
    @Req() request: Request,
  ): Promise<InstagramProfileDto | BuscaCompletaDto | InstagramPostDto[]> {
    if (query.tipo === 'perfil')
      return this.instagram.fetchPerfil(query.username);
    if (query.tipo === 'posts')
      return this.instagram.fetchPosts(query.username);
    return this.instagram.fetchBuscaCompleta(
      query.username,
      query.fingerprint!,
      this.clientIp(request),
    );
  }

  private clientIp(request: Request): string {
    return (request.ip || request.socket.remoteAddress || '0.0.0.0').replace(
      /^::ffff:/,
      '',
    );
  }
}
