import { Controller, Get, Query } from '@nestjs/common';
import { ConfigService } from '../config/config.service';
import { PrismaService } from '../prisma/prisma.service';
import { MetricsDateRangeDto } from './dto/lead-admin.dto';
import { MetricsSummaryDto } from './dto/metrics-summary.dto';

function parseDateRange(query: MetricsDateRangeDto): { gte?: Date; lte?: Date } {
  const range: { gte?: Date; lte?: Date } = {};
  if (query.startDate) range.gte = new Date(query.startDate);
  if (query.endDate) {
    const end = new Date(query.endDate);
    end.setHours(23, 59, 59, 999);
    range.lte = end;
  }
  return range;
}

@Controller('internal/metrics')
export class AdminMetricsController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {}

  @Get('summary')
  async summary(
    @Query() query: MetricsDateRangeDto,
  ): Promise<MetricsSummaryDto> {
    const now = new Date();
    const today = new Date(now);
    today.setHours(0, 0, 0, 0);
    const cutoff = new Date(
      now.getTime() - this.config.get('leadsGracePeriodMinutes') * 60_000,
    );
    const dateRange = parseDateRange(query);
    const hasDateRange = Object.keys(dateRange).length > 0;

    const [total, createdToday, graceExpired, active, totalCalls, failedCalls] =
      await this.prisma.$transaction([
        this.prisma.lead.count(),
        this.prisma.lead.count({ where: { firstSearchAt: { gte: today } } }),
        this.prisma.lead.count({ where: { firstSearchAt: { lte: cutoff } } }),
        this.prisma.lead.count({
          where: { firstSearchAt: { gt: cutoff }, searchCount: { gt: 0 } },
        }),
        this.prisma.searchLog.count({
          where: hasDateRange ? { createdAt: dateRange } : {},
        }),
        this.prisma.searchLog.count({
          where: {
            success: false,
            ...(hasDateRange ? { createdAt: dateRange } : {}),
          },
        }),
      ]);
    return {
      leads: { total, today: createdToday, graceExpired, active },
      calls: { total: totalCalls, failed: failedCalls },
      runtime: {
        rateLimitEnabled: this.config.get('rateLimitEnabled'),
        gracePeriodMinutes: this.config.get('leadsGracePeriodMinutes'),
      },
    };
  }

  @Get('calls-by-day')
  async callsByDay(@Query() query: MetricsDateRangeDto) {
    const dateRange = parseDateRange(query);
    const hasDateRange = Object.keys(dateRange).length > 0;
    const results = await this.prisma.searchLog.groupBy({
      by: ['createdAt'],
      where: hasDateRange ? { createdAt: dateRange } : {},
      _count: { id: true },
      _sum: { durationMs: true },
      orderBy: { createdAt: 'asc' },
    });
    return {
      data: results.map((row) => ({
        date: row.createdAt.toISOString().split('T')[0],
        count: row._count.id,
        totalDurationMs: row._sum.durationMs || 0,
      })),
    };
  }
}
