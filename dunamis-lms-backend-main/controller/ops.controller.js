const os = require("os");
const fs = require("fs");
const { promisify } = require("util");
const { execFile } = require("child_process");
const mongoose = require("mongoose");
const axios = require("axios");
const CronRun = require("../model/cronRun.model");
const asyncHandler = require("../utils/asyncHandler");

const execFileAsync = promisify(execFile);

// Every section degrades to its fallback so the endpoint stays useful on a
// dev machine (no pm2, no log file) or during a partial outage.
const section = async (fn, fallback = null) => {
  try {
    return await fn();
  } catch {
    return fallback;
  }
};

const DB_STATES = ["disconnected", "connected", "connecting", "disconnecting"];

const getProcessInfo = () => ({
  uptimeSec: Math.round(process.uptime()),
  nodeVersion: process.version,
  rssBytes: process.memoryUsage().rss,
  heapUsedBytes: process.memoryUsage().heapUsed,
  totalMemBytes: os.totalmem(),
  freeMemBytes: os.freemem(),
  loadAvg: os.loadavg().map((n) => Math.round(n * 100) / 100),
});

const getDisk = async () => {
  const stats = await fs.promises.statfs("/");
  const totalBytes = stats.bsize * stats.blocks;
  const freeBytes = stats.bsize * stats.bavail;
  return {
    totalBytes,
    freeBytes,
    usedPct: Math.round(((totalBytes - freeBytes) / totalBytes) * 100),
  };
};

const getDb = async () => {
  const readyState = mongoose.connection.readyState;
  const result = {
    readyState,
    state: DB_STATES[readyState] || "unknown",
    pingMs: null,
  };
  if (readyState === 1) {
    const start = process.hrtime.bigint();
    await mongoose.connection.db.admin().ping();
    result.pingMs = Number(process.hrtime.bigint() - start) / 1e6;
    result.pingMs = Math.round(result.pingMs * 10) / 10;
  }
  return result;
};

const getPm2 = async () => {
  const { stdout } = await execFileAsync("pm2", ["jlist"], {
    timeout: 5000,
    maxBuffer: 10 * 1024 * 1024,
  });
  const processes = JSON.parse(stdout.slice(stdout.indexOf("["))).map((p) => ({
    name: p.name,
    status: p.pm2_env?.status,
    restarts: p.pm2_env?.restart_time,
    uptimeMs: p.pm2_env?.pm_uptime ? Date.now() - p.pm2_env.pm_uptime : null,
    cpu: p.monit?.cpu,
    memoryBytes: p.monit?.memory,
  }));
  return { available: true, processes };
};

const checkUrl = async (url) => {
  const start = Date.now();
  try {
    const res = await axios.get(url, {
      timeout: 5000,
      validateStatus: () => true,
    });
    return {
      url,
      up: res.status < 500,
      status: res.status,
      latencyMs: Date.now() - start,
    };
  } catch {
    return { url, up: false, status: null, latencyMs: Date.now() - start };
  }
};

const getCrons = async () => {
  const rows = await CronRun.find().sort({ name: 1 }).lean();
  const now = Date.now();
  return rows.map((row) => ({
    ...row,
    overdue:
      !row.lastRunAt ||
      now - new Date(row.lastRunAt).getTime() >
        (row.intervalHours || 24) * 3600000 * 1.25,
  }));
};

const getErrorLog = async () => {
  const logPath = process.env.OPS_ERROR_LOG_PATH;
  if (!logPath) return null;
  const fh = await fs.promises.open(logPath, "r");
  try {
    const { size } = await fh.stat();
    const len = Math.min(size, 32 * 1024);
    const buf = Buffer.alloc(len);
    await fh.read(buf, 0, len, size - len);
    const lines = buf.toString("utf8").split("\n").filter((l) => l.trim());
    return { path: logPath, lines: lines.slice(-50) };
  } finally {
    await fh.close();
  }
};

const getDeploy = async () => {
  const { stdout } = await execFileAsync(
    "git",
    ["log", "-1", "--format=%h|%cI|%s"],
    { cwd: __dirname, timeout: 5000 }
  );
  const [commit, date, ...subject] = stdout.trim().split("|");
  return { commit, date, subject: subject.join("|") };
};

exports.getOpsStatus = asyncHandler(async (req, res) => {
  const websiteUrl = process.env.OPS_WEBSITE_URL || "https://dunamisindia.co.in";
  const dashboardUrl =
    process.env.OPS_DASHBOARD_URL || "https://dashboard.dunamisindia.co.in";

  const [processInfo, disk, db, pm2, website, dashboard, crons, errorLog, deploy] =
    await Promise.all([
      section(getProcessInfo),
      section(getDisk),
      section(getDb),
      section(getPm2, { available: false, processes: [] }),
      section(() => checkUrl(websiteUrl)),
      section(() => checkUrl(dashboardUrl)),
      section(getCrons, []),
      section(getErrorLog),
      section(getDeploy),
    ]);

  res.json({
    success: true,
    generatedAt: new Date().toISOString(),
    process: processInfo,
    disk,
    db,
    pm2,
    frontends: { website, dashboard },
    crons,
    errorLog,
    deploy,
  });
});
