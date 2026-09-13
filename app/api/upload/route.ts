import { kv } from '@vercel/kv';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { uuid, ...payload } = body;
    if (!uuid) return NextResponse.json({ error: 'Missing uuid' }, { status: 400 });

    const key = `device:${uuid}`;
    const existing = (await kv.get(key)) || {};
    const updated = { ...existing, ...payload, lastSeen: Date.now() };
    await kv.set(key, updated);

    return NextResponse.json({ status: 'ok' });
  } catch {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  }
}