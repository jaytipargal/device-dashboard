import { kv } from '@vercel/kv';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const uuid = searchParams.get('uuid');

  if (uuid) {
    const device = await kv.get(`device:${uuid}`);
    return NextResponse.json(device || {});
  }

  const keys = await kv.keys('device:*');
  const devices: Record<string, unknown> = {};
  for (const key of keys) {
    const id = key.replace('device:', '');
    devices[id] = await kv.get(key);
  }
  return NextResponse.json(devices);
}