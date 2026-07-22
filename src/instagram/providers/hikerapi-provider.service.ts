import {
  BadGatewayException,
  GatewayTimeoutException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import axios, { AxiosError, AxiosInstance } from 'axios';
import { ConfigService } from '../../config/config.service';
import { InstagramFollowerDto } from '../dto/instagram-follower.dto';
import { InstagramPostDto } from '../dto/instagram-post.dto';
import { InstagramProfileDto } from '../dto/instagram-profile.dto';
import { InstagramProvider } from './instagram-provider.interface';

type UnknownRecord = Record<string, unknown>;

function record(value: unknown): UnknownRecord {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
    ? (value as UnknownRecord)
    : {};
}

function text(...values: unknown[]): string {
  const value = values.find(
    (item) => typeof item === 'string' || typeof item === 'number',
  );
  return value === undefined ? '' : String(value);
}

function numberValue(...values: unknown[]): number {
  const value = Number(
    values.find((item) => item !== undefined && item !== null) ?? 0,
  );
  return Number.isFinite(value) ? value : 0;
}

function booleanValue(...values: unknown[]): boolean {
  const value = values.find((item) => item !== undefined && item !== null);
  return value === true || value === 1 || value === '1' || value === 'true';
}

function listFrom(raw: unknown, keys: string[]): unknown[] {
  const root = record(raw);
  const data = record(root.data);
  for (const source of [root, data]) {
    for (const key of keys)
      if (Array.isArray(source[key])) return source[key] as unknown[];
  }
  return [];
}

@Injectable()
export class HikerApiProvider implements InstagramProvider {
  private readonly http: AxiosInstance;

  constructor(private readonly config: ConfigService) {
    this.http = axios.create({
      baseURL: config.get('hikerApiBaseUrl'),
      timeout: config.get('hikerApiTimeoutMs'),
      headers: { Accept: 'application/json', 'User-Agent': 'spygram-back/1.0' },
    });
  }

  async fetchProfile(username: string): Promise<InstagramProfileDto> {
    const raw = await this.get('/v2/user/by/username', { username });
    const root = record(raw);
    const data = record(root.data);
    const profile = record(
      root.user ??
        data.user ??
        root.profile ??
        data.profile ??
        root.data ??
        raw,
    );
    const normalized = this.normalizeProfile(profile);
    if (!normalized.username || !normalized.pk)
      throw new NotFoundException('Instagram profile not found');
    return normalized;
  }

  async fetchFollowing(userId: string): Promise<InstagramFollowerDto[]> {
    const raw = await this.get('/v2/user/following', { user_id: userId });
    return listFrom(raw, ['users', 'followers', 'items'])
      .map((item) => this.normalizeFollower(record(item)))
      .filter((user) => user.username && !user.is_private)
      .slice(0, 50);
  }

  async fetchUserMedias(
    userId: string,
    amount: number,
  ): Promise<InstagramPostDto[]> {
    const raw = await this.get('/gql/user/medias', {
      user_id: userId,
      amount: Math.max(1, Math.min(amount, 50)),
      flat: true,
    });
    return listFrom(raw, ['items', 'medias', 'posts'])
      .map((item) => this.normalizeMedia(record(item)))
      .filter((media) => Boolean(media.post.image_url || media.post.video_url))
      .slice(0, amount);
  }

  private async get(
    path: string,
    params: Record<string, string | number | boolean>,
  ): Promise<unknown> {
    try {
      const response = await this.http.get<unknown>(path, {
        params: { ...params, access_key: this.config.get('hikerApiAccessKey') },
      });
      return response.data;
    } catch (error) {
      if (error instanceof AxiosError && error.code === 'ECONNABORTED') {
        throw new GatewayTimeoutException('HikerAPI request timed out');
      }
      if (error instanceof AxiosError && error.response?.status === 404) {
        throw new NotFoundException('Instagram resource not found');
      }
      throw new BadGatewayException('HikerAPI request failed');
    }
  }

  private normalizeProfile(user: UnknownRecord): InstagramProfileDto {
    const followedBy = record(user.edge_followed_by);
    const follows = record(user.edge_follow);
    return {
      pk: text(user.pk, user.id),
      username: text(user.username).toLowerCase(),
      full_name: text(user.full_name, user.fullName),
      profile_pic_url: text(
        user.profile_pic_url_hd,
        user.profile_pic_url,
        user.profilePicUrl,
      ),
      follower_count: numberValue(
        user.follower_count,
        user.followers_count,
        followedBy.count,
      ),
      following_count: numberValue(
        user.following_count,
        user.followings_count,
        follows.count,
      ),
      media_count: numberValue(user.media_count, user.posts_count),
      is_private: booleanValue(user.is_private),
      biography: text(user.biography, user.bio),
      is_verified: booleanValue(user.is_verified),
    };
  }

  private normalizeFollower(user: UnknownRecord): InstagramFollowerDto {
    const profile = this.normalizeProfile(user);
    return {
      pk: profile.pk,
      id: text(user.id, user.pk),
      username: profile.username,
      full_name: profile.full_name,
      profile_pic_url: profile.profile_pic_url,
      follower_count: profile.follower_count,
      following_count: profile.following_count,
      media_count: profile.media_count,
      is_private: profile.is_private,
      is_verified: profile.is_verified,
      is_mock: false,
    };
  }

  private normalizeMedia(media: UnknownRecord): InstagramPostDto {
    const user = record(media.user ?? media.owner);
    const captionRecord = record(media.caption);
    const imageCandidates = record(media.image_versions2).candidates;
    const firstImage = Array.isArray(imageCandidates)
      ? record(imageCandidates[0]).url
      : undefined;
    const videoVersions = media.video_versions;
    const firstVideo = Array.isArray(videoVersions)
      ? record(videoVersions[0]).url
      : undefined;
    const imageUrl =
      text(
        media.image_url,
        media.display_url,
        media.thumbnail_url,
        firstImage,
      ) || null;
    const videoUrl = text(media.video_url, firstVideo) || null;
    const takenAt = numberValue(media.taken_at, media.takenAt);
    return {
      de_usuario: {
        username: text(user.username),
        full_name: text(user.full_name, user.fullName),
        profile_pic_url: text(user.profile_pic_url, user.profilePicUrl),
      },
      post: {
        id: text(media.id, media.pk),
        shortcode: text(media.shortcode, media.code),
        image_url: imageUrl,
        video_url: videoUrl,
        is_video: Boolean(videoUrl) || numberValue(media.media_type) === 2,
        caption: text(
          captionRecord.text,
          media.caption_text,
          typeof media.caption === 'string' ? media.caption : '',
        ),
        like_count: numberValue(media.like_count),
        comment_count: numberValue(media.comment_count),
        taken_at: takenAt || null,
      },
      is_mock: false,
    };
  }
}
