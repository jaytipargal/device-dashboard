import { kv } from '@vercel/kv';
import { NextRequest, NextResponse } from 'next/server';

type DeviceRecord = Record<string, unknown>;

const CANONICAL_DEVICE_SOURCE =
  process.env.DEVICE_DATA_SOURCE_URL ||
  'https://jayti-dashboard-piacmkozm-jayti.vercel.app/api/jp-devices';

function asTimestamp(value: unknown) {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string') {
    const parsed = Date.parse(value);
    return Number.isFinite(parsed) ? parsed : undefined;
  }
  return undefined;
}

function normalizeCanonicalDevice(device: DeviceRecord): DeviceRecord | null {
  const network = device.network && typeof device.network === 'object'
    ? device.network as DeviceRecord
    : {};
  const deviceId = String(device.deviceId || device.uuid || '');
  if (!deviceId) return null;

  const battery = [device.battery, network.battery, network.batteryPercent]
    .find(value => typeof value === 'number');

  return {
    uuid: deviceId,
    model: device.model || device.deviceDisplayName || device.deviceType || null,
    ip: network.observedIp || network.publicIp || network.ip || null,
    battery,
    lastSeen: asTimestamp(device.lastSeen),
    android_version: device.android_version || device.androidVersion || null,
    deviceDisplayName: device.deviceDisplayName || deviceId,
    deviceType: device.deviceType || null,
    online: device.online === true,
    live: device.live === true,
    reportedStatus: device.reportedStatus || null,
    staleAlertState: device.staleAlertState || null,
    commandQueueDepth: device.commandQueueDepth || 0,
    network,
    source: 'firestore',
  } as DeviceRecord;
}

async function readCanonicalDevices() {
  try {
    const response = await fetch(CANONICAL_DEVICE_SOURCE, { cache: 'no-store' });
    if (!response.ok) return {};
    const payload = await response.json() as { devices?: DeviceRecord[] };
    return Object.fromEntries(
      (payload.devices || [])
        .map(normalizeCanonicalDevice)
        .filter((device): device is DeviceRecord => Boolean(device))
        .map(device => [String(device.uuid), device]),
    );
  } catch {
    return {};
  }
}

async function readKvDevices() {
  const keys = await kv.keys('device:*');
  const devices: Record<string, DeviceRecord> = {};
  for (const key of keys) {
    const id = key.replace('device:', '');
    const device = await kv.get<DeviceRecord>(key);
    if (device) devices[id] = device;
  }
  return devices;
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const uuid = searchParams.get('uuid');

  try {
    const [canonicalDevices, kvDevices] = await Promise.all([
      readCanonicalDevices(),
      readKvDevices(),
    ]);
    const devices = { ...canonicalDevices, ...kvDevices };
    return NextResponse.json(uuid ? devices[uuid] || {} : devices);
  } catch {
    return NextResponse.json(uuid ? {} : {}, { status: 200 });
  }
}
