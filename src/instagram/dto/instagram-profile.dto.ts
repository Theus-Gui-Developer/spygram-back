export class InstagramProfileDto {
  pk!: string;
  username!: string;
  full_name!: string;
  profile_pic_url!: string;
  follower_count!: number;
  following_count!: number;
  media_count!: number;
  is_private!: boolean;
  biography!: string;
  is_verified!: boolean;
}
