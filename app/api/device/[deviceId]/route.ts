import { kv } from '@vercel/kv';
import { NextRequest, NextResponse } from 'next/server';
import {
  DEVICE_TARGETS,
  isDeviceSlug,
  type DeviceHistory,
  type DevicePayload,
  type DeviceSlug,
  type JsonRecord,
} from '../../../../lib/device-config';

const CANONICAL_DEVICE_SOURCE =
  process.env.DEVICE_DATA_SOURCE_URL ||
  'https://jayti-dashboard-piacmkozm-jayti.vercel.app/api/jp-devices';
const CANONICAL_HISTORY_SOURCE =
  process.env.DEVICE_HISTORY_SOURCE_URL ||
  'https://jayti-dashboard-piacmkozm-jayti.vercel.app/api/jp-device';
const KV_READY = Boolean(process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN);

function hasObject(value: unknown): value is JsonRecord {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

async function fetchJson<T>(url: string): Promise<T> {
  const response = await fetch(url, { cache: 'no-store' });
  if (!response.ok) throw new Error(`Source returned ${response.status}`);
  return response.json() as Promise<T>;
}

async function readKv(key: string) {
  if (!KV_READY) return null;
  try {
    const value = await kv.get<JsonRecord>(key);
    return hasObject(value) ? value : null;
  } catch {
    return null;
  }
}

async function writeKv(key: string, value: JsonRecord) {
  if (!KV_READY) return false;
  try {
    await kv.set(key, value);
    return true;
  } catch {
    return false;
  }
}

async function readCanonicalSnapshot(deviceId: string) {
  const payload = await fetchJson<{ devices?: JsonRecord[] }>(CANONICAL_DEVICE_SOURCE);
  return (payload.devices || []).find((device) => device.deviceId === deviceId) || null;
}

async function readCanonicalHistory(deviceId: string) {
  const url = new URL(CANONICAL_HISTORY_SOURCE);
  url.searchParams.set('days', '30');
  url.searchParams.set('device', deviceId);
  const history = await fetchJson<DeviceHistory>(url.toString());
  return filterHistoryForDevice(history, deviceId);
}

function belongsToDevice(item: JsonRecord, deviceId: string) {
  const identity = [
    item.deviceId,
    item.device_id,
    item.device,
    item.deviceLabel,
    item.device_label,
  ].find((value) => typeof value === 'string' && value.length > 0);
  if (typeof identity !== 'string') return false;

  const normalizedIdentity = identity.toLowerCase();
  const normalizedDeviceId = deviceId.toLowerCase();
  if (normalizedIdentity === normalizedDeviceId) return true;
  if (normalizedDeviceId === 'samsung-s24-ultra') {
    return normalizedIdentity.includes('s24 ultra') || normalizedIdentity.includes('sm-s928b');
  }
  if (normalizedDeviceId === 'jayti-asus-vivobook') {
    return normalizedIdentity.includes('vivobook') || normalizedIdentity.includes('asus');
  }
  return false;
}

function filterHistoryForDevice(history: DeviceHistory, deviceId: string): DeviceHistory {
  const entries = (history.entries || []).filter((item) => belongsToDevice(item, deviceId));
  const events = (history.device_events || []).filter((item) => belongsToDevice(item, deviceId));
  const devices = (history.devices || []).filter((item) => belongsToDevice(item, deviceId));
  return {
    ...history,
    entries,
    device_events: events,
    devices,
    total_entries: entries.length,
    total_events: events.length,
  };
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ deviceId: string }> },
) {
  const { deviceId } = await params;
  if (!isDeviceSlug(deviceId)) {
    return NextResponse.json({ error: 'Unknown device section' }, { status: 404 });
  }

  const target = DEVICE_TARGETS[deviceId as DeviceSlug];
  const kvKey = `dashboard:device:${target.deviceId}:latest`;
  const warnings: string[] = [];
  const cached = await readKv(kvKey);

  let snapshot: JsonRecord | null = null;
  let history: DeviceHistory | null = null;
  let sourceSucceeded = false;

  try {
    snapshot = await readCanonicalSnapshot(target.deviceId);
    sourceSucceeded = true;
  } catch {
    warnings.push('The canonical device source could not be reached.');
  }

  try {
    history = await readCanonicalHistory(target.deviceId);
    sourceSucceeded = true;
  } catch {
    warnings.push('Recent activity history could not be reached.');
  }

  if (!snapshot && cached?.snapshot && hasObject(cached.snapshot)) {
    snapshot = cached.snapshot;
    warnings.push('Showing the last Vercel KV snapshot.');
  }
  if (!history && cached?.history && hasObject(cached.history)) {
    history = cached.history as DeviceHistory;
    warnings.push('Showing the last Vercel KV history snapshot.');
  }

  const fetchedAt = new Date().toISOString();
  const record: DevicePayload = {
    target,
    snapshot,
    history,
    fetchedAt,
    storage: sourceSucceeded ? 'canonical-source' : 'vercel-kv-fallback',
    warnings,
  };

  const persisted = await writeKv(kvKey, {
    snapshot: snapshot || {},
    history: history || {},
    fetchedAt,
  });
  if (persisted) record.storage = 'vercel-kv';
  if (KV_READY && !persisted) warnings.push('Vercel KV mirror is configured but unavailable.');

  return NextResponse.json(record, {
    headers: { 'Cache-Control': 'no-store' },
  });
}
