import { NextRequest, NextResponse } from 'next/server';
import { deviceKey, redis, DEVICE_INDEX_KEY } from '../../../lib/redis';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { uuid, ...payload } = body;
    if (!uuid || typeof uuid !== 'string') {
      return NextResponse.json({ error: 'Missing uuid' }, { status: 400 });
    }

    const key = deviceKey(uuid);
    const existing = (await redis.get<Record<string, unknown>>(key)) || {};
    const updated = { ...existing, ...payload, uuid, lastSeen: Date.now() };

    await Promise.all([
      redis.set(key, updated),
      redis.sadd(DEVICE_INDEX_KEY, uuid),
    ]);

    return NextResponse.json({ status: 'ok' });
  } catch {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  }
}
