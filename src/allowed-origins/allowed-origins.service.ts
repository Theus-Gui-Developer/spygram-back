import { CACHE_MANAGER } from '@nestjs/cache-manager';
import {
  ConflictException,
  Inject,
  Injectable,
  Logger,
} from '@nestjs/common';
import { Cache } from 'cache-manager';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

const CACHE_KEY = 'allowed_origins:enabled';

export interface AllowedOriginList {
  items: {
    id: number;
    origin: string;
    label: string | null;
    enabled: boolean;
    createdAt: Date;
    updatedAt: Date;
  }[];
  total: number;
  page: number;
  limit: number;
  pages: number;
}

export interface CreateAllowedOriginInput {
  origin: string;
  label?: string;
  enabled?: boolean;
}

export interface UpdateAllowedOriginInput {
  origin?: string;
  label?: string | null;
  enabled?: boolean;
}

export function normalizeOrigin(value: string): string {
  const trimmed = value.trim();
  try {
    const url = new URL(trimmed);
    // Browser origin não inclui path, query ou hash.
    return `${url.protocol}//${url.host}`.toLowerCase();
  } catch {
    return trimmed.toLowerCase().replace(/\/$/, '');
  }
}

@Injectable()
export class AllowedOriginsService {
  private readonly logger = new Logger(AllowedOriginsService.name);

  constructor(
    private readonly prisma: PrismaService,
    @Inject(CACHE_MANAGER) private readonly cache: Cache,
  ) {}

  async list(
    page = 1,
    limit = 50,
    search?: string,
  ): Promise<AllowedOriginList> {
    const where: Prisma.AllowedOriginWhereInput = search
      ? {
          OR: [
            { origin: { contains: search, mode: 'insensitive' as const } },
            { label: { contains: search, mode: 'insensitive' as const } },
          ],
        }
      : {};

    const [items, total] = await this.prisma.$transaction([
      this.prisma.allowedOrigin.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.allowedOrigin.count({ where }),
    ]);

    return {
      items,
      total,
      page,
      limit,
      pages: Math.ceil(total / limit),
    };
  }

  async findEnabled(): Promise<string[]> {
    const cached = await this.cache.get<string[]>(CACHE_KEY);
    if (cached) return cached;

    const origins = await this.prisma.allowedOrigin.findMany({
      where: { enabled: true },
      select: { origin: true },
      orderBy: { createdAt: 'desc' },
    });

    const list = origins.map((origin) => normalizeOrigin(origin.origin));
    await this.cache.set(CACHE_KEY, list, 0); // 0 = no TTL; cache invalidated on writes
    return list;
  }

  async isAllowed(origin: string | undefined): Promise<boolean> {
    const list = await this.findEnabled();
    const normalizedOrigin = origin ? normalizeOrigin(origin) : undefined;
    this.logger.log(
      `CORS check: origin="${origin}" normalized="${normalizedOrigin}" allowed=[${list.join(', ')}]`,
    );
    if (!list.length) {
      this.logger.warn(
        'Nenhuma origem permitida cadastrada. Permitindo todas as origens temporariamente. Cadastre origens em /internal/allowed-origins.',
      );
      return true;
    }
    if (!normalizedOrigin) return true; // requisições same-origin ou sem Origin header
    return list.includes(normalizedOrigin);
  }

  async create(input: CreateAllowedOriginInput) {
    const normalized = normalizeOrigin(input.origin);
    const existing = await this.prisma.allowedOrigin.findUnique({
      where: { origin: normalized },
    });
    if (existing) {
      throw new ConflictException(
        `Origem já cadastrada: ${normalized}`,
      );
    }
    const created = await this.prisma.allowedOrigin.create({
      data: {
        origin: normalized,
        label: input.label?.trim() || null,
        enabled: input.enabled ?? true,
      },
    });
    await this.invalidateCache();
    return created;
  }

  async update(id: number, input: UpdateAllowedOriginInput) {
    const data: Prisma.AllowedOriginUpdateInput = {};
    if (input.origin !== undefined) data.origin = normalizeOrigin(input.origin);
    if (input.label !== undefined) data.label = input.label?.trim() || null;
    if (input.enabled !== undefined) data.enabled = input.enabled;

    const updated = await this.prisma.allowedOrigin.update({
      where: { id },
      data,
    });
    await this.invalidateCache();
    return updated;
  }

  async remove(id: number) {
    await this.prisma.allowedOrigin.delete({ where: { id } });
    await this.invalidateCache();
    return { deleted: true, id };
  }

  async invalidateCache(): Promise<void> {
    await this.cache.del(CACHE_KEY);
  }
}
