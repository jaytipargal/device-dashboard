import { NextRequest, NextResponse } from 'next/server';
import { deviceKey, redis, DEVICE_INDEX_KEY } from '../../../lib/redis';

type DeviceRecord = Record<string, unknown>;

async function readAllDevices() {
  const uuids = await redis.smembers(DEVICE_INDEX_KEY);
  if (uuids.length === 0) return {};

  const records = await Promise.all(
    uuids.map(uuid => redis.get<DeviceRecord>(deviceKey(uuid))),
  );

  const devices: Record<string, DeviceRecord> = {};
  uuids.forEach((uuid, index) => {
    const record = records[index];
    if (record) devices[uuid] = record;
  });
  return devices;
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const uuid = searchParams.get('uuid');

  try {
    if (uuid) {
      const device = await redis.get<DeviceRecord>(deviceKey(uuid));
      return NextResponse.json(device || {});
    }

    const devices = await readAllDevices();
    return NextResponse.json(devices);
  } catch {
    return NextResponse.json(uuid ? {} : {}, { status: 200 });
  }
}
