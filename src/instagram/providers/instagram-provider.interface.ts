import { InstagramFollowerDto } from '../dto/instagram-follower.dto';
import { InstagramPostDto } from '../dto/instagram-post.dto';
import { InstagramProfileDto } from '../dto/instagram-profile.dto';

export const INSTAGRAM_PROVIDER = Symbol('INSTAGRAM_PROVIDER');

export interface InstagramProvider {
  fetchProfile(username: string): Promise<InstagramProfileDto>;
  fetchFollowing(userId: string): Promise<InstagramFollowerDto[]>;
  fetchUserMedias(userId: string, amount: number): Promise<InstagramPostDto[]>;
}
