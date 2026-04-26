import type { BillingTier } from '@preview-qa/domain';

export const TIER_LIMITS: Record<BillingTier, {
  runsPerMonth: number;
  concurrencyCap: number;
  reposPerInstallation: number;
  priceMonthly: number;
}> = {
  free:    { runsPerMonth: 50,    concurrencyCap: 2,  reposPerInstallation: 1,   priceMonthly: 0   },
  starter: { runsPerMonth: 500,   concurrencyCap: 5,  reposPerInstallation: 5,   priceMonthly: 29  },
  growth:  { runsPerMonth: 2000,  concurrencyCap: 10, reposPerInstallation: 20,  priceMonthly: 99  },
  team:    { runsPerMonth: 10000, concurrencyCap: 20, reposPerInstallation: 100, priceMonthly: 299 },
};
