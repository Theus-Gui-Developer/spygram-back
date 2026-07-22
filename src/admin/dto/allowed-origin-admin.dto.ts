import { Transform } from 'class-transformer';
import {
  IsBoolean,
  IsInt,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';

export class ListAllowedOriginsQueryDto {
  @IsOptional()
  @IsInt()
  @Min(1)
  @Transform(({ value }) => Number(value ?? 1))
  page?: number = 1;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Transform(({ value }) => Number(value ?? 50))
  limit?: number = 50;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  search?: string;
}

export class CreateAllowedOriginDto {
  @IsString()
  @MinLength(1)
  @MaxLength(500)
  origin!: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  label?: string;

  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) =>
    value === 'true' || value === true ? true : false,
  )
  enabled?: boolean = true;
}

export class UpdateAllowedOriginDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(500)
  origin?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  label?: string;

  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) =>
    value === 'true' || value === true ? true : false,
  )
  enabled?: boolean;
}
