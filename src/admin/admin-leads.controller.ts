import {
  Body,
  Controller,
  Delete,
  Get,
  NotFoundException,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { AdminListQueryDto, DeleteLeadDto } from './dto/lead-admin.dto';

@Controller('internal/leads')
export class AdminLeadsController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  async list(@Query() query: AdminListQueryDto) {
    const search = query.search?.trim();
    const dateFilter: { gte?: Date; lte?: Date } = {};
    if (query.startDate) dateFilter.gte = new Date(query.startDate);
    if (query.endDate) {
      const end = new Date(query.endDate);
      end.setHours(23, 59, 59, 999);
      dateFilter.lte = end;
    }

    const where: Prisma.LeadWhereInput = {
      ...(search
        ? {
            OR: [
              { username: { contains: search, mode: 'insensitive' as const } },
              { fullName: { contains: search, mode: 'insensitive' as const } },
              { ip: { contains: search } },
              { fingerprint: { contains: search } },
              { leadId: { contains: search } },
            ],
          }
        : {}),
      ...(Object.keys(dateFilter).length > 0
        ? { lastSearchAt: dateFilter }
        : {}),
    };

    const [items, total] = await this.prisma.$transaction([
      this.prisma.lead.findMany({
        where,
        orderBy: { lastSearchAt: 'desc' },
        skip: (query.page - 1) * query.limit,
        take: query.limit,
      }),
      this.prisma.lead.count({ where }),
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
    const lead = await this.prisma.lead.findUnique({ where: { id } });
    if (!lead) throw new NotFoundException('Lead not found');
    return lead;
  }

  @Patch(':id/reset')
  async reset(@Param('id', ParseIntPipe) id: number) {
    await this.ensureExists(id);
    const now = new Date();
    return this.prisma.lead.update({
      where: { id },
      data: {
        username: null,
        fullName: null,
        profilePicUrl: null,
        followerCount: 0,
        followingCount: 0,
        mediaCount: 0,
        isPrivate: null,
        searchCount: 0,
        firstSearchAt: now,
        lastSearchAt: now,
      },
    });
  }

  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.deleteById(id);
  }

  @Post('delete')
  fallbackRemove(@Body() body: DeleteLeadDto) {
    return this.deleteById(body.id);
  }

  private async deleteById(id: number) {
    await this.ensureExists(id);
    await this.prisma.lead.delete({ where: { id } });
    return { deleted: true, id };
  }

  private async ensureExists(id: number): Promise<void> {
    const exists = await this.prisma.lead.findUnique({
      where: { id },
      select: { id: true },
    });
    if (!exists) throw new NotFoundException('Lead not found');
  }
}
