import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { ForbiddenException, Inject, Injectable } from '@nestjs/common';
import { Cache } from 'cache-manager';
import { createHash } from 'node:crypto';
import { ConfigService } from '../config/config.service';
import { LeadsService } from '../leads/leads.service';
import { PrismaService } from '../prisma/prisma.service';
import { BuscaCompletaDto } from './dto/busca-completa.dto';
import { InstagramFollowerDto } from './dto/instagram-follower.dto';
import { InstagramPostDto } from './dto/instagram-post.dto';
import { InstagramProfileDto } from './dto/instagram-profile.dto';
import {
  INSTAGRAM_PROVIDER,
  InstagramProvider,
} from './providers/instagram-provider.interface';

@Injectable()
export class InstagramService {
  constructor(
    @Inject(INSTAGRAM_PROVIDER) private readonly provider: InstagramProvider,
    @Inject(CACHE_MANAGER) private readonly cache: Cache,
    private readonly config: ConfigService,
    private readonly leads: LeadsService,
    private readonly prisma: PrismaService,
  ) {}

  async fetchPerfil(
    username: string,
    context?: { ip?: string; fingerprint?: string },
  ): Promise<InstagramProfileDto> {
    const start = Date.now();
    try {
      const key = `instagram:profile:${username}`;
      const cached = await this.cache.get<InstagramProfileDto>(key);
      if (cached) {
        await this.logSearch('instagram.perfil', username, true, start, context);
        return cached;
      }
      const profile = await this.provider.fetchProfile(username);
      await this.cache.set(key, profile, this.ttl());
      await this.logSearch('instagram.perfil', username, true, start, context);
      return profile;
    } catch (error) {
      await this.logSearch(
        'instagram.perfil',
        username,
        false,
        start,
        context,
        error instanceof Error ? error.message : 'unknown',
      );
      throw error;
    }
  }

  async fetchPosts(username: string): Promise<InstagramPostDto[]> {
    const profile = await this.fetchPerfil(username);
    if (profile.is_private) return [];
    const key = `instagram:posts:${profile.pk}`;
    const cached = await this.cache.get<InstagramPostDto[]>(key);
    if (cached) return cached;
    const posts = await this.provider.fetchUserMedias(profile.pk, 9);
    await this.cache.set(key, posts, this.ttl());
    return posts;
  }

  async fetchBuscaCompleta(
    username: string,
    fingerprint: string,
    ip: string,
  ): Promise<BuscaCompletaDto> {
    const start = Date.now();
    const status = await this.leads.checkStatus(ip, fingerprint, username);
    const leadId = createHash('sha256')
      .update(fingerprint || ip)
      .digest('hex');

    if (!status.canSearch) {
      await this.logSearch(
        'instagram.busca_completa',
        username,
        false,
        start,
        { ip, fingerprint, leadId },
        'Search not allowed',
      );
      throw new ForbiddenException({ message: 'Search not allowed', status });
    }

    const key = `instagram:complete:${username}`;
    const cached = await this.cache.get<BuscaCompletaDto>(key);
    let result: BuscaCompletaDto;
    let fromCache = false;
    try {
      if (cached) {
        fromCache = true;
        result = { ...cached, meta: { ...cached.meta, cached: true } };
      } else {
        const profile = await this.fetchPerfil(username);
        if (profile.is_private) {
          result = {
            instagram_profile: profile,
            instagram_followers: [],
            followers: [],
            instagram_posts: [],
            feed_stories_order: [],
            meta: {
              source: 'hikerapi',
              cached: false,
              generated_at: new Date().toISOString(),
            },
          };
        } else {
          const following = await this.provider.fetchFollowing(profile.pk);
          const selected = this.pickRandom(following, 5);
          const mediaResults = await Promise.allSettled(
            selected.map((follower) =>
              this.provider.fetchUserMedias(follower.pk || follower.id, 1),
            ),
          );
          const posts = mediaResults.flatMap((media, index) => {
            if (media.status !== 'fulfilled') return [];
            return media.value.map((post) => ({
              ...post,
              de_usuario: {
                username: post.de_usuario.username || selected[index].username,
                full_name: post.de_usuario.full_name || selected[index].full_name,
                profile_pic_url:
                  post.de_usuario.profile_pic_url ||
                  selected[index].profile_pic_url,
              },
            }));
          });
          result = {
            instagram_profile: profile,
            instagram_followers: selected,
            followers: selected,
            instagram_posts: posts,
            feed_stories_order: selected.map((follower) => follower.username),
            meta: {
              source: 'hikerapi',
              cached: false,
              generated_at: new Date().toISOString(),
            },
          };
        }
        await this.cache.set(key, result, this.ttl());
      }

      await this.leads.saveSearch(
        leadId,
        ip,
        fingerprint,
        result.instagram_profile,
        status.gracePeriodExpired,
      );
      await this.logSearch(
        'instagram.busca_completa',
        username,
        true,
        start,
        { ip, fingerprint, leadId },
        undefined,
        fromCache,
      );
      return result;
    } catch (error) {
      await this.logSearch(
        'instagram.busca_completa',
        username,
        false,
        start,
        { ip, fingerprint, leadId },
        error instanceof Error ? error.message : 'unknown',
        false,
      );
      throw error;
    }
  }

  private async logSearch(
    endpoint: string,
    username: string,
    success: boolean,
    startTime: number,
    context?: { ip?: string; fingerprint?: string; leadId?: string },
    errorMessage?: string,
    cached = false,
  ): Promise<void> {
    try {
      await this.prisma.searchLog.create({
        data: {
          endpoint,
          username,
          ip: context?.ip || null,
          fingerprint: context?.fingerprint || null,
          leadId: context?.leadId || null,
          success,
          cached,
          durationMs: Date.now() - startTime,
          errorMessage: errorMessage || null,
        },
      });
    } catch {
      // Logging failure must not break the API.
    }
  }

  private ttl(): number {
    return this.config.get('cacheTtlSeconds') * 1000;
  }

  private pickRandom(
    items: InstagramFollowerDto[],
    limit: number,
  ): InstagramFollowerDto[] {
    const shuffled = [...items];
    for (let index = shuffled.length - 1; index > 0; index -= 1) {
      const randomIndex = Math.floor(Math.random() * (index + 1));
      [shuffled[index], shuffled[randomIndex]] = [
        shuffled[randomIndex],
        shuffled[index],
      ];
    }
    return shuffled.slice(0, limit);
  }
}
