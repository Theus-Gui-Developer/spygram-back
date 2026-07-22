import { ForbiddenException, Injectable } from '@nestjs/common';
import { Lead, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { InstagramProfileDto } from '../instagram/dto/instagram-profile.dto';
import { LeadStatusDto } from './dto/lead-status.dto';
import { LeadsAccessPolicyService } from './leads-access-policy.service';

type PrismaReader = Pick<PrismaService, 'lead'> | Prisma.TransactionClient;

@Injectable()
export class LeadsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly policy: LeadsAccessPolicyService,
  ) {}

  async checkStatus(
    ip: string,
    fingerprint?: string,
    username?: string,
  ): Promise<LeadStatusDto> {
    const leads = await this.findMatching(this.prisma, ip, fingerprint);
    return this.policy.computeLeadSearchStatus({
      leads,
      ip,
      fingerprint,
      username,
    });
  }

  async saveSearch(
    leadId: string,
    ip: string,
    fingerprint: string | undefined,
    profileData: Record<string, unknown> | InstagramProfileDto,
    resetWindow = false,
  ): Promise<Lead> {
    const username = this.stringValue(profileData.username);
    return this.prisma.$transaction(
      async (transaction) => {
        const matches = await this.findMatching(transaction, ip, fingerprint);
        const status = this.policy.computeLeadSearchStatus({
          leads: matches,
          ip,
          fingerprint,
          username,
        });
        if (!status.canSearch) {
          throw new ForbiddenException({
            message: 'Search not allowed',
            status,
          });
        }

        const now = new Date();
        const existing = [...matches].sort(
          (a, b) => b.lastSearchAt.getTime() - a.lastSearchAt.getTime(),
        )[0];
        const data = {
          ip,
          fingerprint: fingerprint || null,
          username: username || null,
          fullName: this.stringValue(profileData.full_name) || null,
          profilePicUrl: this.stringValue(profileData.profile_pic_url) || null,
          followerCount: this.numberValue(profileData.follower_count),
          followingCount: this.numberValue(profileData.following_count),
          mediaCount: this.numberValue(profileData.media_count),
          isPrivate: this.booleanValue(profileData.is_private),
          lastSearchAt: now,
        };

        if (!existing) {
          return transaction.lead.create({
            data: { ...data, leadId, firstSearchAt: now, searchCount: 1 },
          });
        }
        const shouldReset =
          status.gracePeriodExpired || (resetWindow && !status.windowActive);
        return transaction.lead.update({
          where: { id: existing.id },
          data: {
            ...data,
            firstSearchAt: shouldReset ? now : existing.firstSearchAt,
            searchCount: shouldReset ? 1 : { increment: 1 },
          },
        });
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
    );
  }

  private findMatching(
    client: PrismaReader,
    ip: string,
    fingerprint?: string,
  ): Promise<Lead[]> {
    return client.lead.findMany({
      where: {
        OR: [{ ip }, ...(fingerprint ? [{ fingerprint }] : [])],
      },
      orderBy: { lastSearchAt: 'desc' },
    });
  }

  private stringValue(value: unknown): string {
    return typeof value === 'string' ? value.trim() : '';
  }

  private numberValue(value: unknown): number {
    const number = Number(value ?? 0);
    return Number.isFinite(number) ? Math.max(0, Math.trunc(number)) : 0;
  }

  private booleanValue(value: unknown): boolean | null {
    return typeof value === 'boolean' ? value : null;
  }
}
