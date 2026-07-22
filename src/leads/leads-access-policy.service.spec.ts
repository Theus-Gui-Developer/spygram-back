import { Lead } from '@prisma/client';
import { ConfigService } from '../config/config.service';
import { LeadsAccessPolicyService } from './leads-access-policy.service';

const now = new Date('2026-07-22T12:00:00.000Z');

function lead(overrides: Partial<Lead> = {}): Lead {
  return {
    id: 1,
    leadId: 'lead-1',
    fingerprint: 'fingerprint-1',
    ip: '127.0.0.1',
    username: 'alice',
    fullName: null,
    profilePicUrl: null,
    followerCount: 0,
    followingCount: 0,
    mediaCount: 0,
    isPrivate: false,
    geoCountry: null,
    geoRegion: null,
    geoCity: null,
    geoOrg: null,
    geoLat: null,
    geoLon: null,
    geoDisplayName: null,
    geoUpdatedAt: null,
    searchCount: 1,
    firstSearchAt: new Date(now.getTime() - 5 * 60_000),
    lastSearchAt: new Date(now.getTime() - 5 * 60_000),
    ...overrides,
  };
}

describe('LeadsAccessPolicyService', () => {
  const values: Record<string, unknown> = {
    leadsGracePeriodMinutes: 15,
    leadsMaxSearchesPerIp: 1,
    leadsMaxSearchesPerFingerprint: 1,
  };
  const config = { get: (key: string) => values[key] } as ConfigService;
  const policy = new LeadsAccessPolicyService(config);

  it('allows a first search', () => {
    expect(
      policy.computeLeadSearchStatus({
        leads: [],
        ip: '127.0.0.1',
        fingerprint: 'fingerprint-1',
        username: 'alice',
        now,
      }),
    ).toMatchObject({ canSearch: true, exists: false, windowActive: false });
  });

  it('locks a different username during the grace period', () => {
    expect(
      policy.computeLeadSearchStatus({
        leads: [lead()],
        ip: '127.0.0.1',
        fingerprint: 'fingerprint-1',
        username: 'bob',
        now,
      }),
    ).toMatchObject({
      canSearch: false,
      blockReason: 'username_locked',
      previousUsername: 'alice',
    });
  });

  it('resets limits after the grace period', () => {
    expect(
      policy.computeLeadSearchStatus({
        leads: [lead({ firstSearchAt: new Date(now.getTime() - 16 * 60_000) })],
        ip: '127.0.0.1',
        fingerprint: 'fingerprint-1',
        username: 'bob',
        now,
      }),
    ).toMatchObject({
      canSearch: true,
      gracePeriodExpired: true,
      searchCount: 0,
    });
  });
});
