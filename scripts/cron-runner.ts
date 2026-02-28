#!/usr/bin/env npx tsx
/**
 * Open Mandi — Cron Runner
 *
 * Periodically calls the sync-deposits and sync-withdrawals cron endpoints.
 * Designed to run via pm2 alongside the market maker on the same VM.
 *
 * Usage:
 *   npx tsx scripts/cron-runner.ts
 *
 * Env:
 *   CRON_BASE_URL  — Base URL of the deployed app (e.g. https://dev.openmandi.com)
 *   CRON_SECRET    — Bearer token for authenticating cron requests
 *
 * Intervals:
 *   sync-deposits:    every 30 seconds
 *   sync-withdrawals: every 60 seconds
 */

import { config } from "dotenv";
config({ path: ".env.local", override: true });

const BASE_URL = process.env.CRON_BASE_URL ?? "https://dev.openmandi.com";
const CRON_SECRET = process.env.CRON_SECRET;
const VERCEL_BYPASS = process.env.VERCEL_AUTOMATION_BYPASS_SECRET;

if (!CRON_SECRET) {
  console.error("[cron-runner] CRON_SECRET is not set — exiting.");
  process.exit(1);
}

const JOBS = [
  { name: "sync-deposits", path: "/api/cron/sync-deposits", intervalMs: 30_000 },
  { name: "sync-withdrawals", path: "/api/cron/sync-withdrawals", intervalMs: 60_000 },
] as const;

async function runJob(job: (typeof JOBS)[number]) {
  const url = `${BASE_URL}${job.path}`;
  const tag = `[${job.name}]`;

  try {
    const headers: Record<string, string> = {
      Authorization: `Bearer ${CRON_SECRET}`,
    };
    if (VERCEL_BYPASS) {
      headers["x-vercel-protection-bypass"] = VERCEL_BYPASS;
    }

    const res = await fetch(url, {
      method: "GET",
      headers,
      signal: AbortSignal.timeout(30_000),
    });

    const body = await res.json().catch(() => null);

    if (!res.ok) {
      console.error(`${tag} HTTP ${res.status}:`, body);
      return;
    }

    // Only log if something actually happened
    const hasActivity =
      body &&
      ((body.confirmed ?? 0) > 0 ||
        (body.rejected ?? 0) > 0 ||
        (body.submittedToChain ?? 0) > 0 ||
        (body.completed ?? 0) > 0);

    if (hasActivity) {
      console.log(`${tag}`, JSON.stringify(body));
    }
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error(`${tag} Error:`, msg);
  }
}

// Start each job on its own interval
for (const job of JOBS) {
  console.log(`[cron-runner] Starting ${job.name} every ${job.intervalMs / 1000}s → ${BASE_URL}${job.path}`);

  // Run once immediately
  runJob(job);

  // Then repeat
  setInterval(() => runJob(job), job.intervalMs);
}

console.log("[cron-runner] Running. Press Ctrl+C to stop.");
