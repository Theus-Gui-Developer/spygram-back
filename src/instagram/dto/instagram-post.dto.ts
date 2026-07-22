export class InstagramPostDto {
  de_usuario!: {
    username: string;
    full_name: string;
    profile_pic_url: string;
  };
  post!: {
    id: string;
    shortcode: string;
    image_url: string | null;
    video_url: string | null;
    is_video: boolean;
    caption: string;
    like_count: number;
    comment_count: number;
    taken_at: number | null;
  };
  is_mock!: false;
}
