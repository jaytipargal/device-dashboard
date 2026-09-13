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

export default function DeviceDataPage() {
  const [devices, setDevices] = useState<Record<string, DeviceInfo>>({});
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

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

  const filtered = Object.entries(devices).filter(([id, d]) =>
    d.model?.toLowerCase().includes(search.toLowerCase()) ||
    d.ip?.includes(search) ||
    id.toLowerCase().includes(search.toLowerCase())
  );

  const onlineCount = Object.values(devices).filter(d => d.lastSeen && Date.now() - d.lastSeen < 300000).length;

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #0a0a0f 0%, #1a1a2e 50%, #0f0f1a 100%)',
      color: '#e0e0e0',
      fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif"
    }}>
      {/* Header */}
      <header style={{
        background: 'rgba(255,255,255,0.03)',
        backdropFilter: 'blur(20px)',
        borderBottom: '1px solid rgba(255,255,255,0.08)',
        padding: '24px 32px',
        position: 'sticky',
        top: 0,
        zIndex: 100
      }}>
        <div style={{ maxWidth: 1200, margin: '0 auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h1 style={{ margin: 0, fontSize: 24, fontWeight: 700, letterSpacing: '-0.5px' }}>
              📡 Device Data
            </h1>
            <p style={{ margin: '4px 0 0', color: '#6b7280', fontSize: 13 }}>
              Real-time device telemetry from registered devices
            </p>
          </div>
          <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
            <div style={{
              background: '#22c55e20',
              border: '1px solid #22c55e40',
              borderRadius: 20,
              padding: '6px 14px',
              fontSize: 13,
              color: '#22c55e',
              fontWeight: 600
            }}>
              {onlineCount} online
            </div>
            <div style={{
              background: '#3b82f620',
              border: '1px solid #3b82f640',
              borderRadius: 20,
              padding: '6px 14px',
              fontSize: 13,
              color: '#3b82f6',
              fontWeight: 600
            }}>
              {Object.keys(devices).length} total
            </div>
          </div>
        </div>
      </header>

      {/* Search & Filters */}
      <div style={{ maxWidth: 1200, margin: '0 auto', padding: '24px 32px' }}>
        <div style={{ marginBottom: 24 }}>
          <input
            type="text"
            placeholder="Search by model, IP, or device ID…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{
              width: '100%',
              maxWidth: 480,
              padding: '12px 18px',
              background: 'rgba(255,255,255,0.06)',
              border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: 10,
              color: '#e0e0e0',
              fontSize: 14,
              outline: 'none',
              transition: 'border-color 0.2s',
              boxSizing: 'border-box'
            }}
            onFocus={e => e.target.style.borderColor = '#3b82f6'}
            onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,0.1)'}
          />
        </div>

        {/* Stats Bar */}
        <div style={{ display: 'flex', gap: 16, marginBottom: 24, flexWrap: 'wrap' }}>
          {[
            { label: 'Total Devices', value: Object.keys(devices).length, icon: '📱', color: '#3b82f6' },
            { label: 'Online Now', value: onlineCount, icon: '🟢', color: '#22c55e' },
            { label: 'Last Updated', value: new Date().toLocaleTimeString(), icon: '⏱️', color: '#f59e0b' }
          ].map(stat => (
            <div key={stat.label} style={{
              background: 'rgba(255,255,255,0.04)',
              border: '1px solid rgba(255,255,255,0.08)',
              borderRadius: 12,
              padding: '16px 20px',
              flex: '1 1 160px',
              minWidth: 160
            }}>
              <div style={{ fontSize: 12, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: 4 }}>{stat.icon} {stat.label}</div>
              <div style={{ fontSize: 24, fontWeight: 700, color: stat.color }}>{stat.value}</div>
            </div>
          ))}
        </div>

        {/* Device Cards Grid */}
        {loading && Object.keys(devices).length === 0 && (
          <div style={{ textAlign: 'center', padding: 80, color: '#6b7280' }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>⏳</div>
            <p>Waiting for devices to report…</p>
          </div>
        )}

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 20 }}>
          {filtered.map(([uuid, info]) => {
            const isOnline = info.lastSeen && Date.now() - info.lastSeen < 300000;
            return (
              <div key={uuid} style={{
                background: 'rgba(255,255,255,0.05)',
                border: `1px solid ${isOnline ? 'rgba(34,197,94,0.3)' : 'rgba(255,255,255,0.08)'}`,
                borderRadius: 14,
                padding: 24,
                position: 'relative',
                overflow: 'hidden',
                transition: 'transform 0.2s, box-shadow 0.2s'
              }}>
                {/* Gradient accent */}
                <div style={{
                  position: 'absolute', top: 0, left: 0, right: 0, height: 3,
                  background: isOnline
                    ? 'linear-gradient(90deg, #22c55e, #22c55e88)'
                    : 'linear-gradient(90deg, #6b7280, #6b728088)'
                }} />

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
                  <div>
                    <code style={{
                      color: '#e0e0e0',
                      fontSize: 14,
                      fontWeight: 600,
                      background: 'rgba(255,255,255,0.08)',
                      padding: '4px 10px',
                      borderRadius: 6
                    }}>{uuid}</code>
                  </div>
                  <div style={{
                    width: 10, height: 10, borderRadius: '50%',
                    background: isOnline ? '#22c55e' : '#6b7280',
                    boxShadow: isOnline ? '0 0 10px #22c55eaa' : 'none',
                    transition: 'all 0.3s'
                  }} />
                </div>

                <div style={{ fontSize: 14, lineHeight: 1.9 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                    <span style={{ color: '#6b7280' }}>Model</span>
                    <span style={{ color: '#e0e0e0', fontWeight: 500 }}>{info.model || '—'}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                    <span style={{ color: '#6b7280' }}>Android</span>
                    <span style={{ color: '#e0e0e0', fontWeight: 500 }}>{info.android_version || '—'}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                    <span style={{ color: '#6b7280' }}>IP Address</span>
                    <span style={{ color: '#e0e0e0', fontWeight: 500, fontFamily: 'monospace', fontSize: 13 }}>{info.ip || '—'}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                    <span style={{ color: '#6b7280' }}>Battery</span>
                    <span style={{
                      color: info.battery !== undefined ? (info.battery > 20 ? '#22c55e' : '#ef4444') : '#6b7280',
                      fontWeight: 600
                    }}>
                      {info.battery !== undefined ? `${info.battery}%` : '—'}
                    </span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0' }}>
                    <span style={{ color: '#6b7280' }}>Last Seen</span>
                    <span style={{ color: '#e0e0e0', fontWeight: 500, fontSize: 13 }}>
                      {info.lastSeen ? new Date(info.lastSeen).toLocaleString() : '—'}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {filtered.length === 0 && !loading && (
          <div style={{ textAlign: 'center', padding: 60, color: '#6b7280' }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>🔍</div>
            <p>No devices match your search.</p>
          </div>
        )}
      </div>
    </div>
  );
}