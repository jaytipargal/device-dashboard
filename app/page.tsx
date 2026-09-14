'use client';
import { useState, useEffect, useCallback } from 'react';

interface DeviceInfo {
  model?: string;
  ip?: string;
  battery?: number;
  lastSeen?: number;
  uuid?: string;
  android_version?: string;
  timestamp?: number;
}

export default function Dashboard() {
  const [devices, setDevices] = useState<Record<string, DeviceInfo>>({});
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [now, setNow] = useState<number | null>(null);
  const [updatedAt, setUpdatedAt] = useState<number | null>(null);

  const loadDevices = useCallback(async () => {
    try {
      const res = await fetch('/api/data', { cache: 'no-store' });
      if (!res.ok) throw new Error(`Device API returned ${res.status}`);
      const data = await res.json();
      setDevices(data);
      const timestamp = Date.now();
      setNow(timestamp);
      setUpdatedAt(timestamp);
    } catch {}
    finally { setLoading(false); }
  }, []);

  useEffect(() => {
    const initialLoad = window.setTimeout(() => { void loadDevices(); }, 0);
    const interval = window.setInterval(() => { void loadDevices(); }, 10000);
    return () => {
      window.clearTimeout(initialLoad);
      window.clearInterval(interval);
    };
  }, [loadDevices]);

  const filtered = Object.entries(devices).filter(([id, d]) =>
    d.model?.toLowerCase().includes(search.toLowerCase()) ||
    d.ip?.includes(search) ||
    id.toLowerCase().includes(search.toLowerCase())
  );

  const isOnline = (device: DeviceInfo) =>
    now !== null && Boolean(device.lastSeen && now - device.lastSeen < 300000);
  const onlineCount = Object.values(devices).filter(isOnline).length;

  return (
    <div style={{ minHeight: '100vh', background: '#0a0a0f', color: '#e0e0e0', fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif" }}>

      <header style={{
        background: 'rgba(255,255,255,0.03)',
        backdropFilter: 'blur(20px)',
        borderBottom: '1px solid rgba(255,255,255,0.08)',
        padding: '20px 32px',
        position: 'sticky',
        top: 0,
        zIndex: 100
      }}>
        <div style={{ maxWidth: 1200, margin: '0 auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h1 style={{ margin: 0, fontSize: 22, fontWeight: 700, letterSpacing: '-0.5px' }}>
              📡 Device Dashboard
            </h1>
            <p style={{ margin: '4px 0 0', color: '#6b7280', fontSize: 13 }}>
              Real-time device telemetry · auto-refresh every 10s
            </p>
          </div>
          <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
            <span style={{ background: '#22c55e20', border: '1px solid #22c55e40', borderRadius: 20, padding: '5px 14px', fontSize: 12, color: '#22c55e', fontWeight: 600 }}>{onlineCount} online</span>
            <span style={{ background: '#3b82f620', border: '1px solid #3b82f640', borderRadius: 20, padding: '5px 14px', fontSize: 12, color: '#3b82f6', fontWeight: 600 }}>{Object.keys(devices).length} total</span>
          </div>
        </div>
      </header>

      <main style={{ maxWidth: 1200, margin: '0 auto', padding: '32px 24px' }}>

        <section style={{ marginBottom: 48 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
            <h2 style={{ fontSize: 18, fontWeight: 600, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '1px' }}>
              📋 Device Data
            </h2>
            <input
              type="text"
              placeholder="Search model, IP, or device ID…"
              value={search}
              onChange={e => setSearch(e.target.value)}
              style={{
                padding: '10px 16px',
                background: 'rgba(255,255,255,0.06)',
                border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: 10,
                color: '#e0e0e0',
                fontSize: 13,
                outline: 'none',
                minWidth: 260,
                maxWidth: 400,
                boxSizing: 'border-box'
              }}
              onFocus={e => e.target.style.borderColor = '#3b82f6'}
              onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,0.1)'}
            />
          </div>

          {/* Stats Row */}
          <div style={{ display: 'flex', gap: 14, marginBottom: 20, flexWrap: 'wrap' }}>
            {[
              { label: 'Total', value: Object.keys(devices).length, color: '#3b82f6' },
              { label: 'Online', value: onlineCount, color: '#22c55e' },
              { label: 'Filtered', value: filtered.length, color: '#f59e0b' },
              { label: 'Updated', value: updatedAt ? new Date(updatedAt).toLocaleTimeString() : '—', color: '#8b5cf6' }
            ].map(s => (
              <div key={s.label} style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 10, padding: '12px 18px', flex: '1 1 120px', minWidth: 120 }}>
                <div style={{ fontSize: 11, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{s.label}</div>
                <div style={{ fontSize: 22, fontWeight: 700, color: s.color }}>{s.value}</div>
              </div>
            ))}
          </div>

          {/* Cards Grid */}
          {loading && Object.keys(devices).length === 0 && filtered.length === 0 && (
            <div style={{ textAlign: 'center', padding: 60, color: '#6b7280' }}>
              <div style={{ fontSize: 36, marginBottom: 8 }}>⏳</div>
              <p>Waiting for devices…</p>
            </div>
          )}

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 18 }}>
            {filtered.map(([uuid, info]) => {
              const isDeviceOnline = isOnline(info);
              return (
                <div key={uuid} style={{
                  background: 'linear-gradient(135deg, rgba(255,255,255,0.06) 0%, rgba(255,255,255,0.02) 100%)',
                  border: `1px solid ${isDeviceOnline ? 'rgba(34,197,94,0.2)' : 'rgba(255,255,255,0.06)'}`,
                  borderRadius: 14,
                  padding: 22,
                  position: 'relative',
                  overflow: 'hidden'
                }}>
                  <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 3, background: isDeviceOnline ? 'linear-gradient(90deg, #22c55e, #22c55e88)' : 'linear-gradient(90deg, #6b7280, #6b728088)' }} />
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
                    <code style={{ color: '#e0e0e0', fontSize: 13, fontWeight: 600, background: 'rgba(255,255,255,0.08)', padding: '4px 10px', borderRadius: 6 }}>{uuid}</code>
                    <div style={{ width: 10, height: 10, borderRadius: '50%', background: isDeviceOnline ? '#22c55e' : '#6b7280', boxShadow: isDeviceOnline ? '0 0 10px #22c55eaa' : 'none' }} />
                  </div>
                  <div style={{ fontSize: 13, lineHeight: 2 }}>
                    {[
                      ['Model', info.model || '—'],
                      ['Android', info.android_version || '—'],
                      ['IP', info.ip || '—'],
                      ['Battery', info.battery !== undefined ? `${info.battery}%` : '—'],
                      ['Last Seen', info.lastSeen ? new Date(info.lastSeen).toLocaleString() : '—']
                    ].map(([label, val]) => (
                      <div key={label} style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                        <span style={{ color: '#6b7280' }}>{label}</span>
                        <span style={{
                          color: label === 'Battery' && info.battery !== undefined ? (info.battery > 20 ? '#22c55e' : '#ef4444') : '#e0e0e0',
                          fontWeight: 500,
                          fontFamily: label === 'IP' ? 'monospace' : 'inherit',
                          fontSize: label === 'IP' ? 12 : 13
                        }}>{val}</span>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>

          {filtered.length === 0 && !loading && (
            <div style={{ textAlign: 'center', padding: 50, color: '#6b7280' }}>
              <div style={{ fontSize: 36, marginBottom: 8 }}>🔍</div>
              <p>No devices match your search.</p>
            </div>
          )}
        </section>

      </main>
    </div>
  );
}
