import { apiRequest } from '../lib/api';

/**
 * "Connects" Garmin by creating a placeholder device record.
 * Garmin data actually flows through Apple Health:
 * Garmin Connect app → Apple Health → Aria's Apple Health integration.
 *
 * No OAuth or browser flow needed.
 */
export async function connectGarmin(): Promise<boolean> {
  await apiRequest('/api/integrations/connect', {
    method: 'POST',
    data: { provider: 'garmin' },
  });
  return true;
}
