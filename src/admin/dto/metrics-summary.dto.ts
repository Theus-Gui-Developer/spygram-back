export class MetricsSummaryDto {
  leads!: {
    total: number;
    today: number;
    graceExpired: number;
    active: number;
  };
  calls!: { total: number; failed: number };
  runtime!: { rateLimitEnabled: boolean; gracePeriodMinutes: number };
}
