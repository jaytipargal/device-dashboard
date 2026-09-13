'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  DEVICE_TARGETS,
  formatUnknown,
  type DeviceHistory,
  type DevicePayload,
  type DeviceSlug,
  type JsonRecord,
} from '../lib/device-config';

const REFRESH_MS = 15000;

function asArray(value: unknown) {
  return Array.isArray(value) ? value.filter((item): item is JsonRecord => Boolean(item) && typeof item === 'object') : [];
}

function displayTime(value: unknown) {
  if (!value) return 'Not reported';
  const date = new Date(String(value));
  return Number.isNaN(date.getTime()) ? formatUnknown(value) : date.toLocaleString();
}

function relativeTime(value: unknown) {
  if (!value) return 'No heartbeat yet';
  const time = new Date(String(value)).getTime();
  if (!Number.isFinite(time)) return 'Unknown age';
  const seconds = Math.max(0, Math.round((Date.now() - time) / 1000));
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  return `${Math.round(minutes / 60)}h ago`;
}

function statusFor(snapshot: JsonRecord | null) {
  if (!snapshot) return { label: 'No source', tone: 'unknown' };
  if (snapshot.live === true) return { label: 'Live', tone: 'live' };
  if (snapshot.online === true) return { label: 'Online flag only', tone: 'warn' };
  return { label: 'Offline or stale', tone: 'offline' };
}

function valueFrom(record: JsonRecord | null, path: string[]) {
  let value: unknown = record;
  for (const key of path) {
    if (!value || typeof value !== 'object') return undefined;
    value = (value as JsonRecord)[key];
  }
  return value;
}

function Metric({ label, value, tone = '' }: { label: string; value: string; tone?: string }) {
  return (
    <div className="device-metric">
      <span>{label}</span>
      <strong className={tone}>{value}</strong>
    </div>
  );
}

function DetailRow({ label, value }: { label: string; value: unknown }) {
  return (
    <div className="device-detail-row">
      <dt>{label}</dt>
      <dd>{formatUnknown(value)}</dd>
    </div>
  );
}

function Activity({ history }: { history: DeviceHistory | null }) {
  const events = asArray(history?.device_events).slice(0, 8);
  const entries = asArray(history?.entries).slice(0, 8);
  const items = events.length ? events : entries;

  if (!items.length) {
    return <p className="device-empty">No activity was reported in the last 30 days.</p>;
  }

  return (
    <ol className="device-timeline">
      {items.map((item, index) => (
        <li key={`${String(item.timestamp || item.visitedAt || index)}-${index}`}>
          <span className="timeline-dot" />
          <div>
            <strong>{formatUnknown(item.event_type || item.title || item.page_title, 'Activity')}</strong>
            <p>{formatUnknown(item.url || item.page_url, 'No URL recorded')}</p>
            <time>{displayTime(item.timestamp || item.visitedAt)}</time>
          </div>
        </li>
      ))}
    </ol>
  );
}

export default function DevicePanel({ slug }: { slug: DeviceSlug }) {
  const target = DEVICE_TARGETS[slug];
  const [payload, setPayload] = useState<DevicePayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    try {
      const response = await fetch(`/api/device/${slug}`, { cache: 'no-store' });
      const body = await response.json() as DevicePayload & { error?: string };
      if (!response.ok) throw new Error(body.error || `Device API returned ${response.status}`);
      setPayload(body);
      setError('');
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Unable to load device data.');
    } finally {
      setLoading(false);
    }
  }, [slug]);

  useEffect(() => {
    const first = window.setTimeout(() => void load(), 0);
    const interval = window.setInterval(() => void load(), REFRESH_MS);
    return () => {
      window.clearTimeout(first);
      window.clearInterval(interval);
    };
  }, [load]);

  const snapshot = payload?.snapshot || null;
  const history = payload?.history || null;
  const status = statusFor(snapshot);
  const network = valueFrom(snapshot, ['network']);
  const queue = asArray(valueFrom(snapshot, ['commandQueue']));
  const battery = valueFrom(snapshot, ['network', 'batteryPercent']) ?? valueFrom(snapshot, ['battery']);
  const queuePending = valueFrom(snapshot, ['commandQueuePendingDepth']) ?? queue.filter((item) => item.status === 'pending').length;
  const sourceLabel = payload?.storage === 'vercel-kv' ? 'Vercel KV mirror' : payload?.storage === 'vercel-kv-fallback' ? 'Vercel KV fallback' : 'Canonical source';
  const networkRows = useMemo(() => {
    if (!network || typeof network !== 'object') return [];
    return Object.entries(network as JsonRecord)
      .filter(([key, value]) => !['networkPerApp', 'connections', 'interfaces'].includes(key) && value !== null && value !== undefined)
      .slice(0, 12);
  }, [network]);

  return (
    <main className={`device-shell ${target.accent}`}>
      <div className="device-noise" aria-hidden="true" />
      <nav className="device-nav" aria-label="Dashboard navigation">
        <Link href="/" className="device-brand">EKA <span>FIELD SYSTEM</span></Link>
        <div className="device-nav-links">
          <Link href="/s24" className={slug === 's24' ? 'active' : ''}>S24 Ultra</Link>
          <Link href="/vivobook" className={slug === 'vivobook' ? 'active' : ''}>VivoBook</Link>
        </div>
      </nav>

      <section className="device-hero">
        <div className="device-kicker"><span className="device-kicker-mark" /> {target.eyebrow}</div>
        <div className="device-hero-grid">
          <div>
            <p className="device-index">DEVICE / {target.icon}</p>
            <h1>{target.name}</h1>
            <p className="device-description">{target.description}</p>
          </div>
          <div className={`device-signal ${status.tone}`}>
            <span className="signal-pulse" />
            <div><strong>{status.label}</strong><small>{relativeTime(snapshot?.lastSeen)}</small></div>
          </div>
        </div>
        <div className="device-meta-strip">
          <span>Canonical ID <b>{target.deviceId}</b></span>
          <span>Data path <b>{sourceLabel}</b></span>
          <span>Refresh <b>15 seconds</b></span>
        </div>
      </section>

      {error && <div className="device-alert error" role="alert">{error}</div>}
      {payload?.warnings.map((warning) => <div className="device-alert" key={warning}>{warning}</div>)}
      {loading && !payload && <div className="device-alert">Connecting to the canonical device source…</div>}

      <section className="device-metrics" aria-label="Device summary">
        <Metric label="Heartbeat" value={displayTime(snapshot?.lastSeen)} tone={status.tone} />
        <Metric label="Battery" value={battery === undefined ? 'Not reported' : `${formatUnknown(battery)}%`} />
        <Metric label="Queue" value={`${formatUnknown(valueFrom(snapshot, ['commandQueueDepth']), '0')} total`} />
        <Metric label="Pending" value={formatUnknown(queuePending, '0')} tone={Number(queuePending) > 0 ? 'warn' : ''} />
      </section>

      <div className="device-content-grid">
        <section className="device-card device-card-tall">
          <div className="device-card-head"><div><span className="device-card-label">01 / identity</span><h2>What is connected</h2></div><span className="device-card-icon">◈</span></div>
          <dl className="device-details">
            <DetailRow label="Display name" value={snapshot?.deviceDisplayName} />
            <DetailRow label="Device type" value={snapshot?.deviceType} />
            <DetailRow label="Model" value={snapshot?.model} />
            <DetailRow label="Reported status" value={snapshot?.reportedStatus} />
            <DetailRow label="Connection" value={snapshot?.connectionMethod} />
            <DetailRow label="Heartbeat interval" value={snapshot?.heartbeatIntervalSeconds ? `${formatUnknown(snapshot.heartbeatIntervalSeconds)} seconds` : undefined} />
            <DetailRow label="Last seen" value={displayTime(snapshot?.lastSeen)} />
          </dl>
        </section>

        <section className="device-card">
          <div className="device-card-head"><div><span className="device-card-label">02 / network</span><h2>Signal & network</h2></div><span className="device-card-icon">⌁</span></div>
          <dl className="device-details">
            {networkRows.length ? networkRows.map(([key, value]) => <DetailRow key={key} label={key} value={value} />) : <DetailRow label="Network" value="Not reported by device" />}
          </dl>
        </section>

        <section className="device-card">
          <div className="device-card-head"><div><span className="device-card-label">03 / command rail</span><h2>Recent queue</h2></div><span className="device-card-icon">↗</span></div>
          {queue.length ? <div className="device-queue">{queue.slice(0, 6).map((item, index) => <div className="queue-row" key={String(item.id || index)}><span>{formatUnknown(item.action, 'Command')}</span><b className={String(item.status || '').toLowerCase()}>{formatUnknown(item.status, 'unknown')}</b></div>)}</div> : <p className="device-empty">No queued commands in the canonical record.</p>}
        </section>

        <section className="device-card device-activity-card">
          <div className="device-card-head"><div><span className="device-card-label">04 / observed activity</span><h2>Last 30 days</h2></div><span className="device-card-count">{formatUnknown(history?.total_events, '0')} events</span></div>
          <Activity history={history} />
        </section>
      </div>

      <footer className="device-footer">Canonical device data only · stale records are intentionally excluded from this section · last page refresh {new Date().toLocaleTimeString()}</footer>
    </main>
  );
}
