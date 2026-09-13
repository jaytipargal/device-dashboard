export const DEVICE_TARGETS = {
  s24: {
    slug: 's24',
    deviceId: 'samsung-s24-ultra',
    name: 'S24 Ultra',
    eyebrow: 'Mobile field unit',
    description: 'A live view of the canonical Samsung S24 Ultra device record.',
    accent: 'amber',
    icon: 'S24',
  },
  vivobook: {
    slug: 'vivobook',
    deviceId: 'jayti-asus-vivobook',
    name: 'VivoBook',
    eyebrow: 'Desktop field unit',
    description: 'A live view of the canonical ASUS VivoBook device record.',
    accent: 'mint',
    icon: 'VB',
  },
} as const;

export type DeviceSlug = keyof typeof DEVICE_TARGETS;

export type JsonRecord = Record<string, unknown>;

export interface DeviceHistory {
  success?: boolean;
  source?: string;
  generated_at?: string;
  window_days?: number;
  total_events?: number;
  total_entries?: number;
  entries?: JsonRecord[];
  devices?: JsonRecord[];
  device_events?: JsonRecord[];
  [key: string]: unknown;
}

export interface DevicePayload {
  target: (typeof DEVICE_TARGETS)[DeviceSlug];
  snapshot: JsonRecord | null;
  history: DeviceHistory | null;
  fetchedAt: string;
  storage: 'vercel-kv' | 'canonical-source' | 'vercel-kv-fallback';
  warnings: string[];
}

export function isDeviceSlug(value: string): value is DeviceSlug {
  return value in DEVICE_TARGETS;
}

export function formatUnknown(value: unknown, empty = 'Not reported') {
  if (value === null || value === undefined || value === '') return empty;
  if (typeof value === 'string') return value;
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  return JSON.stringify(value);
}
