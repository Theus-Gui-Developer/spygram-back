import { InstagramFollowerDto } from './instagram-follower.dto';
import { InstagramPostDto } from './instagram-post.dto';
import { InstagramProfileDto } from './instagram-profile.dto';

export class BuscaCompletaDto {
  instagram_profile!: InstagramProfileDto;
  instagram_followers!: InstagramFollowerDto[];
  followers!: InstagramFollowerDto[];
  instagram_posts!: InstagramPostDto[];
  feed_stories_order!: string[];
  meta!: { source: 'hikerapi'; cached: boolean; generated_at: string };
}
