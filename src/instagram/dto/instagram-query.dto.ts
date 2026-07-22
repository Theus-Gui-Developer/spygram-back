import { Transform } from 'class-transformer';
import {
  IsIn,
  IsString,
  Matches,
  MaxLength,
  MinLength,
  ValidateIf,
} from 'class-validator';

export class InstagramQueryDto {
  @IsIn(['perfil', 'busca_completa', 'posts'])
  tipo!: 'perfil' | 'busca_completa' | 'posts';

  @Transform(({ value }: { value: unknown }) =>
    String(value ?? '')
      .trim()
      .replace(/^@/, '')
      .toLowerCase(),
  )
  @IsString()
  @MinLength(1)
  @MaxLength(30)
  @Matches(/^[a-z0-9._]+$/)
  username!: string;

  @ValidateIf((query: InstagramQueryDto) => query.tipo === 'busca_completa')
  @IsString()
  @MinLength(8)
  @MaxLength(200)
  fingerprint?: string;
}
