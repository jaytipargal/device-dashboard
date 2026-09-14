import { Redis } from '@upstash/redis';

export const redis = new Redis({
  url: process.env.KV_REST_API_URL!,
  token: process.env.KV_REST_API_TOKEN!,
});

export const DEVICE_INDEX_KEY = 'devices:index';

export function deviceKey(uuid: string) {
  return `device:${uuid}`;
}
