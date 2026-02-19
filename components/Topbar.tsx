"use client";

interface TopbarProps {
  snapshotId?: string;
  timestamp?: string;
}

function formatTime(iso: string): string {
  const d = new Date(iso);
  const h = String(d.getUTCHours()).padStart(2, "0");
  const m = String(d.getUTCMinutes()).padStart(2, "0");
  const s = String(d.getUTCSeconds()).padStart(2, "0");
  return `${h}:${m}:${s} UTC`;
}

export default function Topbar({ snapshotId, timestamp }: TopbarProps) {
  const formattedTime = timestamp ? formatTime(timestamp) : "--:--:--";

  return (
    <header className="h-14 bg-white border-b border-gray-200 flex items-center justify-between px-6">
      <div className="flex items-center gap-3">
        <h1 className="text-sm font-semibold text-gray-900">
          Operations Console
        </h1>
        <span className="text-xs text-gray-400">|</span>
        <span className="text-xs text-gray-500">
          Snapshot: {snapshotId ?? "—"}
        </span>
      </div>
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500" />
          </span>
          <span className="text-xs text-gray-500">Live</span>
        </div>
        <span className="text-xs font-mono text-gray-600">{formattedTime}</span>
      </div>
    </header>
  );
}
