import { Injectable } from '@nestjs/common';
import { Lead } from '@prisma/client';
import { ConfigService } from '../config/config.service';
import { LeadStatusDto } from './dto/lead-status.dto';

export interface LeadSearchStatusParams {
  leads: Lead[];
  ip: string;
  fingerprint?: string;
  username?: string;
  now?: Date;
}

@Injectable()
export class LeadsAccessPolicyService {
  constructor(private readonly config: ConfigService) {}

  computeLeadSearchStatus(params: LeadSearchStatusParams): LeadStatusDto {
    const now = params.now ?? new Date();
    const graceMs = this.config.get('leadsGracePeriodMinutes') * 60_000;
    const active = params.leads.filter(
      (lead) => now.getTime() - lead.firstSearchAt.getTime() < graceMs,
    );
    const latest = [...active].sort(
      (a, b) => b.firstSearchAt.getTime() - a.firstSearchAt.getTime(),
    )[0];
    const ipCount = active
      .filter((lead) => lead.ip === params.ip)
      .reduce((total, lead) => total + lead.searchCount, 0);
    const fingerprintCount = params.fingerprint
      ? active
          .filter((lead) => lead.fingerprint === params.fingerprint)
          .reduce((total, lead) => total + lead.searchCount, 0)
      : 0;
    const reachedIpLimit = ipCount >= this.config.get('leadsMaxSearchesPerIp');
    const reachedFingerprintLimit =
      Boolean(params.fingerprint) &&
      fingerprintCount >= this.config.get('leadsMaxSearchesPerFingerprint');
    const usernameLocked = Boolean(
      latest?.username &&
      params.username &&
      latest.username.toLowerCase() !== params.username.toLowerCase(),
    );
    const expiresAt = latest
      ? latest.firstSearchAt.getTime() + graceMs
      : now.getTime();
    const blockReason = usernameLocked
      ? 'username_locked'
      : reachedIpLimit
        ? 'ip_limit'
        : reachedFingerprintLimit
          ? 'fingerprint_limit'
          : null;

    return {
      exists: params.leads.length > 0,
      searchCount: Math.max(ipCount, fingerprintCount),
      canSearch: blockReason === null,
      blockReason,
      gracePeriodExpired: active.length === 0,
      gracePeriodRemaining: latest
        ? Math.max(0, Math.ceil((expiresAt - now.getTime()) / 1000))
        : 0,
      previousUsername: latest?.username ?? null,
      reachedIpLimit,
      reachedFingerprintLimit,
      windowActive: active.length > 0,
    };
  }
}
