import React from "react";
import { FiRefreshCw, FiInbox } from "react-icons/fi";
import { useOpsStatus } from "../../hooks/useOpsStatus";

const PILL_TONES = {
  emerald: "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200",
  rose: "bg-rose-50 text-rose-700 ring-1 ring-rose-200",
  amber: "bg-amber-50 text-amber-700 ring-1 ring-amber-200",
  slate: "bg-slate-100 text-slate-600 ring-1 ring-slate-200",
};

const StatusPill = ({ tone = "slate", label }) => (
  <span
    className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold ${PILL_TONES[tone]}`}
  >
    <span
      className={`h-1.5 w-1.5 rounded-full ${
        tone === "emerald"
          ? "bg-emerald-500"
          : tone === "rose"
          ? "bg-rose-500"
          : tone === "amber"
          ? "bg-amber-500"
          : "bg-slate-400"
      }`}
    />
    {label}
  </span>
);

const StatCard = ({ title, pill, children }) => (
  <div className="rounded-2xl border border-slate-200 bg-white p-5">
    <div className="flex items-center justify-between gap-2">
      <p className="text-sm font-medium text-slate-500">{title}</p>
      {pill}
    </div>
    <div className="mt-3 space-y-1 text-sm text-slate-700">{children}</div>
  </div>
);

const formatBytes = (bytes) => {
  if (bytes == null) return "—";
  if (bytes >= 1024 ** 3) return `${(bytes / 1024 ** 3).toFixed(1)} GB`;
  if (bytes >= 1024 ** 2) return `${(bytes / 1024 ** 2).toFixed(0)} MB`;
  return `${Math.round(bytes / 1024)} KB`;
};

const formatUptime = (input) => {
  const sec = typeof input === "number" ? input : null;
  if (sec == null) return "—";
  const d = Math.floor(sec / 86400);
  const h = Math.floor((sec % 86400) / 3600);
  const m = Math.floor((sec % 3600) / 60);
  if (d > 0) return `${d}d ${h}h`;
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
};

const timeAgo = (value) => {
  if (!value) return "never";
  const diff = Date.now() - new Date(value).getTime();
  if (diff < 60_000) return "just now";
  const min = Math.floor(diff / 60_000);
  if (min < 60) return `${min} min ago`;
  const hrs = Math.floor(min / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
};

const pctTone = (pct) => (pct >= 90 ? "rose" : pct >= 80 ? "amber" : "emerald");

const usedPct = (total, free) =>
  total ? Math.round(((total - free) / total) * 100) : null;

const EmptyBox = ({ text }) => (
  <div className="flex flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-slate-300 bg-white py-10 text-slate-400">
    <FiInbox className="text-2xl" />
    <p className="text-sm">{text}</p>
  </div>
);

const SectionCard = ({ title, subtitle, children }) => (
  <div className="rounded-2xl border border-slate-200 bg-white p-5">
    <div className="mb-4">
      <h2 className="text-base font-semibold text-slate-900">{title}</h2>
      {subtitle && <p className="text-xs text-slate-500">{subtitle}</p>}
    </div>
    {children}
  </div>
);

const SystemStatus = () => {
  const { data, isLoading, isError, error, refetch, isFetching, dataUpdatedAt } =
    useOpsStatus();

  if (isLoading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-6 w-48 rounded-2xl bg-slate-200" />
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="h-32 rounded-2xl bg-slate-100" />
            ))}
          </div>
          <div className="h-64 rounded-2xl bg-slate-100" />
        </div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="p-6">
        <div className="rounded-2xl border border-rose-200 bg-rose-50 p-6 text-center">
          <p className="font-semibold text-rose-700">
            Could not reach the API server
          </p>
          <p className="mt-1 text-sm text-rose-600">
            {error?.response?.data?.message || error?.message}
          </p>
          <button
            onClick={() => refetch()}
            className="mt-4 rounded-2xl bg-rose-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-rose-700"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  const { process: proc, disk, db, pm2, frontends, crons, errorLog, deploy } =
    data || {};

  const memPct = proc ? usedPct(proc.totalMemBytes, proc.freeMemBytes) : null;
  const dbUp = db?.readyState === 1;

  const frontendCard = (label, info) => (
    <StatCard
      title={label}
      pill={
        info ? (
          <StatusPill
            tone={info.up ? "emerald" : "rose"}
            label={info.up ? "Up" : "Down"}
          />
        ) : (
          <StatusPill tone="slate" label="Unknown" />
        )
      }
    >
      <p>HTTP {info?.status ?? "—"}</p>
      <p className="text-slate-500">
        {info?.latencyMs != null ? `${info.latencyMs} ms` : "no response"}
      </p>
    </StatCard>
  );

  return (
    <div className="space-y-6 p-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-orange-500">
            Operations
          </p>
          <h1 className="text-2xl font-bold text-slate-900">System Status</h1>
          <p className="text-sm text-slate-500">
            Live health of the API, database, frontends, and background jobs.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs text-slate-400">
            Updated {timeAgo(dataUpdatedAt)}
          </span>
          <button
            onClick={() => refetch()}
            disabled={isFetching}
            className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 hover:border-orange-300 hover:text-orange-600 disabled:opacity-60"
          >
            <FiRefreshCw className={isFetching ? "animate-spin" : ""} />
            Refresh
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
        <StatCard title="API Server" pill={<StatusPill tone="emerald" label="Up" />}>
          <p>Uptime {formatUptime(proc?.uptimeSec)}</p>
          <p className="text-slate-500">
            {proc?.nodeVersion} · RSS {formatBytes(proc?.rssBytes)}
          </p>
        </StatCard>

        <StatCard
          title="Database"
          pill={
            <StatusPill
              tone={dbUp ? "emerald" : "rose"}
              label={db?.state || "unknown"}
            />
          }
        >
          <p>{db?.pingMs != null ? `Ping ${db.pingMs} ms` : "No ping"}</p>
          <p className="text-slate-500">MongoDB</p>
        </StatCard>

        {frontendCard("Website", frontends?.website)}
        {frontendCard("Dashboard", frontends?.dashboard)}

        <StatCard
          title="VPS Resources"
          pill={
            disk || memPct != null ? (
              <StatusPill
                tone={pctTone(Math.max(disk?.usedPct ?? 0, memPct ?? 0))}
                label={`${Math.max(disk?.usedPct ?? 0, memPct ?? 0)}% used`}
              />
            ) : (
              <StatusPill tone="slate" label="Unknown" />
            )
          }
        >
          <p>
            Mem {memPct != null ? `${memPct}%` : "—"} · Disk{" "}
            {disk?.usedPct != null ? `${disk.usedPct}%` : "—"}
          </p>
          <p className="text-slate-500">
            Load {proc?.loadAvg?.join(" / ") || "—"}
          </p>
        </StatCard>
      </div>

      <SectionCard
        title="PM2 Processes"
        subtitle="Processes managed by PM2 on the VPS"
      >
        {pm2?.available && pm2.processes?.length ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-slate-100 text-xs uppercase tracking-wider text-slate-400">
                  <th className="py-2 pr-4 font-medium">Process</th>
                  <th className="py-2 pr-4 font-medium">Status</th>
                  <th className="py-2 pr-4 font-medium">Restarts</th>
                  <th className="py-2 pr-4 font-medium">Uptime</th>
                  <th className="py-2 pr-4 font-medium">CPU</th>
                  <th className="py-2 font-medium">Memory</th>
                </tr>
              </thead>
              <tbody>
                {pm2.processes.map((p) => (
                  <tr key={p.name} className="border-b border-slate-50">
                    <td className="py-2.5 pr-4 font-medium text-slate-800">
                      {p.name}
                    </td>
                    <td className="py-2.5 pr-4">
                      <StatusPill
                        tone={p.status === "online" ? "emerald" : "rose"}
                        label={p.status || "unknown"}
                      />
                    </td>
                    <td className="py-2.5 pr-4 text-slate-600">{p.restarts}</td>
                    <td className="py-2.5 pr-4 text-slate-600">
                      {formatUptime(p.uptimeMs != null ? p.uptimeMs / 1000 : null)}
                    </td>
                    <td className="py-2.5 pr-4 text-slate-600">
                      {p.cpu != null ? `${p.cpu}%` : "—"}
                    </td>
                    <td className="py-2.5 text-slate-600">
                      {formatBytes(p.memoryBytes)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <EmptyBox text="PM2 is not available in this environment" />
        )}
      </SectionCard>

      <SectionCard
        title="Scheduled Jobs"
        subtitle="Last heartbeat from each backend cron"
      >
        {crons?.length ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-slate-100 text-xs uppercase tracking-wider text-slate-400">
                  <th className="py-2 pr-4 font-medium">Job</th>
                  <th className="py-2 pr-4 font-medium">Schedule</th>
                  <th className="py-2 pr-4 font-medium">Last run</th>
                  <th className="py-2 pr-4 font-medium">Duration</th>
                  <th className="py-2 font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {crons.map((c) => (
                  <tr
                    key={c.name}
                    className={`border-b border-slate-50 ${
                      c.overdue ? "bg-amber-50/60" : ""
                    }`}
                  >
                    <td className="py-2.5 pr-4 font-medium text-slate-800">
                      {c.name}
                    </td>
                    <td className="py-2.5 pr-4 font-mono text-xs text-slate-500">
                      {c.schedule || "—"}
                    </td>
                    <td className="py-2.5 pr-4 text-slate-600">
                      {c.lastRunAt ? timeAgo(c.lastRunAt) : "No runs yet"}
                    </td>
                    <td className="py-2.5 pr-4 text-slate-600">
                      {c.lastDurationMs != null
                        ? `${(c.lastDurationMs / 1000).toFixed(1)}s`
                        : "—"}
                    </td>
                    <td className="py-2.5">
                      <span className="flex items-center gap-2">
                        {c.lastStatus === "error" ? (
                          <StatusPill tone="rose" label="Error" />
                        ) : c.lastStatus === "success" ? (
                          <StatusPill tone="emerald" label="OK" />
                        ) : (
                          <StatusPill tone="slate" label="Pending" />
                        )}
                        {c.overdue && <StatusPill tone="amber" label="Overdue" />}
                        {c.lastError && (
                          <span
                            className="max-w-[200px] truncate text-xs text-rose-600"
                            title={c.lastError}
                          >
                            {c.lastError}
                          </span>
                        )}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <EmptyBox text="No cron heartbeats recorded yet" />
        )}
      </SectionCard>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <SectionCard
            title="Recent Errors"
            subtitle={errorLog?.path || "Backend error log tail"}
          >
            {errorLog?.lines?.length ? (
              <pre className="max-h-80 overflow-auto rounded-2xl bg-slate-950 p-4 font-mono text-xs leading-relaxed text-slate-200">
                {errorLog.lines.join("\n")}
              </pre>
            ) : (
              <EmptyBox text="No error log available in this environment" />
            )}
          </SectionCard>
        </div>

        <SectionCard title="Last Deploy" subtitle="Latest commit on the server">
          {deploy ? (
            <div className="space-y-2 text-sm">
              <p className="font-mono text-xs text-orange-600">{deploy.commit}</p>
              <p className="font-medium text-slate-800">{deploy.subject}</p>
              <p className="text-slate-500">{timeAgo(deploy.date)}</p>
            </div>
          ) : (
            <EmptyBox text="Deploy info unavailable" />
          )}
        </SectionCard>
      </div>
    </div>
  );
};

export default SystemStatus;
