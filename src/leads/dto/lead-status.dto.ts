export class LeadStatusDto {
  exists!: boolean;
  searchCount!: number;
  canSearch!: boolean;
  blockReason!: 'username_locked' | 'ip_limit' | 'fingerprint_limit' | null;
  gracePeriodExpired!: boolean;
  gracePeriodRemaining!: number;
  previousUsername!: string | null;
  reachedIpLimit!: boolean;
  reachedFingerprintLimit!: boolean;
  windowActive!: boolean;
}
