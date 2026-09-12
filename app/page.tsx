'use client';
import { useState, useEffect } from 'react';

interface DeviceInfo {
  model?: string;
  ip?: string;
  battery?: number;
  lastSeen?: number;
  uuid?: string;
}

export default function Dashboard() {
  const [devices, setDevices] = useState<Record<string, DeviceInfo>>({});

  const loadDevices = async () => {
    const res = await fetch('/api/data');
    const data = await res.json();
    setDevices(data);
  };

  useEffect(() => {
    loadDevices();
    const interval = setInterval(loadDevices, 5000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div style={{ padding: 20, fontFamily: 'system-ui, sans-serif', background: '#fff', color: '#111' }}>
      <h1>Device Dashboard</h1>
      {Object.keys(devices).length === 0 && <p>No devices have reported yet.</p>}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 20 }}>
        {Object.entries(devices).map(([uuid, info]) => (
          <div key={uuid} style={{
            border: '1px solid #ddd',
            borderRadius: 8,
            padding: 16,
            width: 300,
            boxShadow: '0 2px 4px rgba(0,0,0,0.05)'
          }}>
            <h3>Device ID</h3>
            <code>{uuid}</code>
            <p><strong>Model:</strong> {info.model || '—'}</p>
            <p><strong>IP:</strong> {info.ip || '—'}</p>
            <p><strong>Battery:</strong> {info.battery !== undefined ? info.battery + '%' : '—'}</p>
            <p><strong>Last seen:</strong> {info.lastSeen ? new Date(info.lastSeen).toLocaleString() : '—'}</p>
          </div>
        ))}
      </div>
    </div>
  );
}