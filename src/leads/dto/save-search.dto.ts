import {
  IsBoolean,
  IsIP,
  IsObject,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';

export class SaveSearchDto {
  @IsString()
  @MinLength(8)
  @MaxLength(200)
  leadId!: string;

  @IsIP()
  ip!: string;

  @IsOptional()
  @IsString()
  @MinLength(8)
  @MaxLength(200)
  fingerprint?: string;

  @IsObject()
  profileData!: Record<string, unknown>;

  @IsOptional()
  @IsBoolean()
  resetWindow?: boolean;
}
