'use client';
import { useState, useEffect, useCallback } from 'react';

interface DeviceInfo {
  model?: string;
  ip?: string;
  battery?: number;
  lastSeen?: number;
  uuid?: string;
}

export default function Dashboard() {
  const [devices, setDevices] = useState<Record<string, DeviceInfo>>({});
  const [loading, setLoading] = useState(true);

  const loadDevices = useCallback(async () => {
    try {
      const res = await fetch('/api/data', { cache: 'no-store' });
      const data = await res.json();
      setDevices(data);
    } catch {}
    finally { setLoading(false); }
  }, []);

  useEffect(() => {
    loadDevices();
    const interval = setInterval(loadDevices, 10000);
    return () => clearInterval(interval);
  }, [loadDevices]);

  return (
    <div style={{ padding: 24, fontFamily: 'system-ui, -apple-system, sans-serif', background: '#0f0f0f', color: '#e5e5e5', minHeight: '100vh' }}>
      <h1 style={{ fontSize: 20, marginBottom: 4 }}>Device Dashboard</h1>
      <p style={{ color: '#666', fontSize: 13, marginBottom: 20 }}>
        Real-time device telemetry · auto-refresh every 10s
      </p>
      {loading && Object.keys(devices).length === 0 && (
        <p style={{ color: '#666', fontSize: 14 }}>Waiting for devices…</p>
      )}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16 }}>
        {Object.entries(devices).map(([uuid, info]) => (
          <div key={uuid} style={{
            border: '1px solid #222',
            borderRadius: 10,
            padding: 16,
            width: 280,
            background: '#1a1a1a',
            boxShadow: '0 1px 3px rgba(0,0,0,0.3)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <code style={{ color: '#0ea5e9', fontSize: 13 }}>{uuid}</code>
              <span style={{
                width: 8, height: 8, borderRadius: '50%', background: '#22c55e',
                display: 'inline-block', boxShadow: '0 0 6px #22c55e88'
              }} />
            </div>
            <div style={{ fontSize: 14, lineHeight: 1.8 }}>
              <p><span style={{ color: '#888' }}>Model:</span> {info.model || '—'}</p>
              <p><span style={{ color: '#888' }}>IP:</span> {info.ip || '—'}</p>
              <p><span style={{ color: '#888' }}>Battery:</span> {info.battery !== undefined ? `${info.battery}%` : '—'}</p>
              <p><span style={{ color: '#888' }}>Last seen:</span> {info.lastSeen ? new Date(info.lastSeen).toLocaleString() : '—'}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}