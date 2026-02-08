export const dynamic = "force-dynamic";

import { formatBigAmount, formatAddress, formatNumber, formatTokenLabel } from "@/lib/utils";
import type { SwapEvent } from "@/types";
import { Badge } from "@/components/ui/badge";

const GRAPHQL_ENDPOINT =
  process.env.INDEXER_URL ||
  process.env.NEXT_PUBLIC_GRAPHQL_ENDPOINT ||
  "http://localhost:8080/v1/graphql";

type GraphQLSwapEvent = {
  id: string;
  swapRequest_id: string;
  eventType: string;
  chainId: string;
  blockNumber: string;
  blockTimestamp: string;
  txHash: string;
  logIndex: string;
  srcChainId?: string | null;
  dstChainId?: string | null;
  requester?: string | null;
  solver?: string | null;
  tokenIn?: string | null;
  tokenOut?: string | null;
  amountIn?: string | null;
  amountOut?: string | null;
  recipient?: string | null;
};

type SolverMetrics = {
  solver: string;
  fulfillments: number;
  tokens: Map<string, bigint>;
  totalAmountOut: bigint;
};

function parseSwapEvent(raw: GraphQLSwapEvent): SwapEvent {
  const toNumber = (value?: string | null) =>
    value == null ? undefined : Number(value);

  const logIndexValue =
    raw.logIndex == null ? undefined : Number(raw.logIndex);

  return {
    id: raw.id,
    requestId: raw.swapRequest_id,
    eventType: raw.eventType === "FULFILLED" ? "FULFILLED" : "REQUESTED",
    chainId: Number(raw.chainId),
    blockNumber: Number(raw.blockNumber),
    blockTimestamp: Number(raw.blockTimestamp),
    txHash: raw.txHash,
    logIndex: logIndexValue,
    srcChainId: toNumber(raw.srcChainId),
    dstChainId: toNumber(raw.dstChainId),
    requester: raw.requester ?? undefined,
    solver: raw.solver ?? undefined,
    tokenIn: raw.tokenIn ?? undefined,
    tokenOut: raw.tokenOut ?? undefined,
    amountIn: raw.amountIn ?? undefined,
    amountOut: raw.amountOut ?? undefined,
    recipient: raw.recipient ?? undefined,
  };
}

async function fetchRecentEvents(limit: number): Promise<SwapEvent[]> {
  const query = `
    query RecentSwapEvents($limit: Int!) {
      SwapEvent(limit: $limit, order_by: { blockTimestamp: desc }) {
        id
        swapRequest_id
        eventType
        chainId
        blockNumber
        blockTimestamp
        txHash
        logIndex
        srcChainId
        dstChainId
        requester
        solver
        tokenIn
        tokenOut
        amountIn
        amountOut
        recipient
      }
    }
  `;
  const fallbackQuery = `
    query RecentSwapEvents($limit: Int!) {
      SwapEvent(limit: $limit, order_by: { blockTimestamp: desc }) {
        id
        swapRequest_id
        eventType
        chainId
        blockNumber
        blockTimestamp
        txHash
        logIndex
        srcChainId
        dstChainId
      }
    }
  `;

  try {
    const res = await fetch(GRAPHQL_ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ query, variables: { limit } }),
      cache: "no-store",
    });
    if (!res.ok) return [];
    const json = await res.json();
    if (Array.isArray(json.errors) && json.errors.length > 0) {
      const fallbackRes = await fetch(GRAPHQL_ENDPOINT, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: fallbackQuery, variables: { limit } }),
        cache: "no-store",
      });
      if (!fallbackRes.ok) return [];
      const fallbackJson = await fallbackRes.json();
      if (Array.isArray(fallbackJson.errors) && fallbackJson.errors.length > 0) {
        return [];
      }
      const fallbackEvents = (fallbackJson.data?.SwapEvent ?? []) as GraphQLSwapEvent[];
      return fallbackEvents.map(parseSwapEvent);
    }
    const events = (json.data?.SwapEvent ?? []) as GraphQLSwapEvent[];
    return events.map(parseSwapEvent);
  } catch {
    return [];
  }
}

function summarizeBySolver(events: SwapEvent[]): SolverMetrics[] {
  const map = new Map<string, SolverMetrics>();

  for (const event of events) {
    if (event.eventType !== "FULFILLED") continue;
    if (!event.solver) continue;

    const solverKey = event.solver.toLowerCase();
    if (!map.has(solverKey)) {
      map.set(solverKey, {
        solver: solverKey,
        fulfillments: 0,
        tokens: new Map<string, bigint>(),
        totalAmountOut: BigInt(0),
      });
    }

    const entry = map.get(solverKey)!;
    entry.fulfillments += 1;

    const tokenOut = (event.tokenOut ?? "").toLowerCase() || "unknown";
    const amountOut = event.amountOut != null
      ? (() => {
          try {
            return BigInt(event.amountOut);
          } catch {
            return BigInt(0);
          }
        })()
      : BigInt(0);

    entry.tokens.set(tokenOut, (entry.tokens.get(tokenOut) ?? BigInt(0)) + amountOut);
    entry.totalAmountOut += amountOut;
  }

  return Array.from(map.values()).sort((a, b) => {
    if (b.fulfillments !== a.fulfillments) {
      return b.fulfillments - a.fulfillments;
    }
    return Number(b.totalAmountOut - a.totalAmountOut);
  });
}

export default async function LeaderboardPage({
  searchParams,
}: {
  searchParams?: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const sp = (await searchParams) ?? {};
  const rawLimit = Array.isArray(sp.limit) ? sp.limit[0] : sp.limit;
  const limit = Math.max(50, Math.min(500, Number(rawLimit ?? 200))) || 200;

  const events = await fetchRecentEvents(limit);
  const solverSummaries = summarizeBySolver(events);

  return (
    <div className="font-sans p-6 sm:p-10 flex flex-col gap-y-8 mt-6">
      <header className="mb-4">
        <div className="flex flex-col items-center gap-1 max-w-2xl text-center mx-auto">
          <h1 className="text-balance text-3xl font-medium md:text-4xl">
            Solver performance snapshot
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-pretty font-mono text-muted-foreground">
            Aggregated fulfillments across recent onlySolvers activity.
          </p>
        </div>
      </header>

      <section className="max-w-5xl mx-auto w-full space-y-4">
        <div className="rounded-lg border overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted/50">
              <tr>
                <th className="text-left px-3 py-3 font-mono uppercase">Solver</th>
                <th className="text-right px-3 py-3 font-mono uppercase">
                  Fulfillments
                </th>
                <th className="text-right px-3 py-3 font-mono uppercase">
                  Tokens
                </th>
                <th className="text-right px-3 py-3 font-mono uppercase">
                  Total Amount
                </th>
              </tr>
            </thead>
            <tbody>
              {solverSummaries.length === 0 ? (
                <tr>
                  <td className="px-3 py-6 text-center" colSpan={5}>
                    No solver fulfillments recorded yet.
                  </td>
                </tr>
              ) : (
                solverSummaries.map((summary) => {
                  const topTokens = Array.from(summary.tokens.entries())
                    .sort((a, b) => Number(b[1] - a[1]))
                    .slice(0, 3);
                  const primaryToken = topTokens[0]?.[0];

                  return (
                    <tr key={summary.solver} className="border-t">
                      <td className="px-3 py-3 align-middle">
                        <Badge className="text-xs flex items-center gap-2">
                          <span className="font-mono">{formatAddress(summary.solver, 6)}</span>
                        </Badge>
                      </td>
                      <td className="px-3 py-3 text-right align-middle font-mono font-medium">
                        {formatNumber(summary.fulfillments)}
                      </td>
                      <td className="px-3 py-3 text-right align-middle">
                        <div className="flex flex-col gap-1 text-xs">
                          {topTokens.length === 0 ? (
                            <span className="text-muted-foreground">—</span>
                          ) : (
                            topTokens.map(([token, amount]) => (
                              <span key={`${summary.solver}-${token}`} className="font-mono">
                                {formatBigAmount(amount, token)}{" "}
                                <span className="text-muted-foreground">
                                  {token === "unknown" ? "unknown" : formatTokenLabel(token)}
                                </span>
                              </span>
                            ))
                          )}
                        </div>
                      </td>
                      <td className="px-3 py-3 text-right align-middle font-mono">
                        {formatBigAmount(summary.totalAmountOut, primaryToken)}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
