import { registerAs } from '@nestjs/config';

export interface RepairRequestsConfig {
  maxReopens: number;
}

export const repairRequestsConfig = registerAs(
  'repairRequests',
  (): RepairRequestsConfig => ({
    maxReopens: Number(process.env.REPAIR_REQUEST_MAX_REOPENS ?? 2),
  }),
);
