import {
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Query,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { SearchLogQueryDto } from './dto/lead-admin.dto';

@Controller('internal/search-logs')
export class AdminSearchLogsController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  async list(@Query() query: SearchLogQueryDto) {
    const search = query.search?.trim();
    const dateRange: { gte?: Date; lte?: Date } = {};
    if (query.startDate) dateRange.gte = new Date(query.startDate);
    if (query.endDate) {
      const end = new Date(query.endDate);
      end.setHours(23, 59, 59, 999);
      dateRange.lte = end;
    }

    const where: Prisma.SearchLogWhereInput = {
      ...(query.endpoint ? { endpoint: { contains: query.endpoint } } : {}),
      ...(query.username
        ? { username: { contains: query.username, mode: 'insensitive' } }
        : {}),
      ...(query.ip ? { ip: { contains: query.ip } } : {}),
      ...(query.fingerprint
        ? { fingerprint: { contains: query.fingerprint } }
        : {}),
      ...(Object.keys(dateRange).length > 0 ? { createdAt: dateRange } : {}),
      ...(search
        ? {
            OR: [
              { endpoint: { contains: search } },
              { username: { contains: search, mode: 'insensitive' as const } },
              { ip: { contains: search } },
              { fingerprint: { contains: search } },
              { errorMessage: { contains: search, mode: 'insensitive' as const } },
            ],
          }
        : {}),
    };

    const [items, total] = await this.prisma.$transaction([
      this.prisma.searchLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (query.page - 1) * query.limit,
        take: query.limit,
        include: { lead: true },
      }),
      this.prisma.searchLog.count({ where }),
    ]);

    return {
      items,
      total,
      page: query.page,
      limit: query.limit,
      pages: Math.ceil(total / query.limit),
    };
  }

  @Get(':id')
  async detail(@Param('id', ParseIntPipe) id: number) {
    return this.prisma.searchLog.findUnique({ where: { id }, include: { lead: true } });
  }

  @Delete(':id')
  async remove(@Param('id', ParseIntPipe) id: number) {
    await this.prisma.searchLog.delete({ where: { id } });
    return { deleted: true, id };
  }
}
