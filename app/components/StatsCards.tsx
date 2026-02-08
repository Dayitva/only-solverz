"use client";

import { useEffect, useState } from "react";
import type { SwapStats } from "@/types";
import { formatNumber } from "@/lib/utils";
import { getChainLabel } from "@/lib/network";

const GRAPHQL_ENDPOINT =
  process.env.NEXT_PUBLIC_GRAPHQL_ENDPOINT || "http://localhost:8080/v1/graphql";

type GraphQLStats = {
  id: string;
  totalRequests: string;
  totalFulfillments: string;
  openRequests: string;
  lastUpdated: string;
};

function parseSwapStats(raw: GraphQLStats): SwapStats {
  return {
    id: raw.id,
    totalRequests: Number(raw.totalRequests),
    totalFulfillments: Number(raw.totalFulfillments),
    openRequests: Number(raw.openRequests),
    lastUpdated: Number(raw.lastUpdated),
  };
}

async function fetchStats(): Promise<SwapStats | null> {
  const query = `
    query SwapStats {
      SwapStats(where: { id: { _eq: "global" } }) {
        id
        totalRequests
        totalFulfillments
        openRequests
        lastUpdated
      }
    }
  `;

  try {
    const res = await fetch(GRAPHQL_ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ query }),
      cache: "no-store",
    });
    if (!res.ok) return null;
    const json = await res.json();
    const rawStats = json.data?.SwapStats?.[0] as GraphQLStats | undefined;
    return rawStats ? parseSwapStats(rawStats) : null;
  } catch {
    return null;
  }
}

type StatsCardsProps = {
  initialStats: SwapStats | null;
  initialActiveChains: number[];
  initialCrossChainPairs: number;
  pollMs?: number;
};

export default function StatsCards({
  initialStats,
  initialActiveChains,
  initialCrossChainPairs,
  pollMs = 4000,
}: StatsCardsProps) {
  const [stats, setStats] = useState<SwapStats | null>(initialStats);

  useEffect(() => {
    let intervalId: NodeJS.Timeout | undefined;
    let mounted = true;

    const poll = async () => {
      if (!mounted) return;
      const freshStats = await fetchStats();
      if (mounted && freshStats) {
        setStats(freshStats);
      }
    };

    // Poll immediately, then set up interval
    poll();
    intervalId = setInterval(poll, pollMs);

    return () => {
      mounted = false;
      if (intervalId) clearInterval(intervalId);
    };
  }, [pollMs]);

  const totalRequestsValue = stats?.totalRequests ?? initialStats?.totalRequests ?? 0;
  const totalFulfillmentsValue =
    stats?.totalFulfillments ?? initialStats?.totalFulfillments ?? 0;

  const activeChains = initialActiveChains;
  const crossChainPairs = initialCrossChainPairs;
  const activeChainLabels = activeChains.map(getChainLabel);
  const activeChainsText = activeChainLabels.join(" • ");

  return (
    <section className="mx-auto grid w-full max-w-5xl grid-cols-1 gap-4 sm:grid-cols-3 lg:grid-cols-3 xl:grid-cols-3">
      <StatCard label="Total requests" value={formatNumber(totalRequestsValue)} />
      <StatCard label="Fulfilled" value={formatNumber(totalFulfillmentsValue)} />
      <StatCard
        label="Active networks"
        value={activeChains.length ? `${activeChains.length} active` : "—"}
        muted={
          activeChains.length
            ? (
                <>
                  <span className="block break-words text-xs text-muted-foreground/80">
                    {activeChainsText}
                  </span>
                  {crossChainPairs > 0 ? (
                    <span className="block text-xs text-muted-foreground/70">
                      {crossChainPairs} cross-chain routes observed
                    </span>
                  ) : null}
                </>
              )
            : undefined
        }
      />
    </section>
  );
}

function StatCard({
  label,
  value,
  muted,
}: {
  label: string;
  value: string;
  muted?: React.ReactNode;
}) {
  return (
    <div className="rounded-lg border bg-card/80 backdrop-blur-sm p-4 shadow-sm">
      <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        {label}
      </div>
      <div className="mt-2 text-3xl font-mono font-semibold text-foreground">
        {value}
      </div>
      {muted && (
        <div className="mt-2 space-y-1 text-xs leading-relaxed text-muted-foreground">
          {muted}
        </div>
      )}
    </div>
  );
}

