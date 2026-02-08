import RecentSwaps from "@/app/components/RecentSwaps";
import StatsCards from "@/app/components/StatsCards";
import type { SwapEvent, SwapStats } from "@/types";

export const dynamic = "force-dynamic";

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

type GraphQLSwapRequest = {
  requestId: string;
  requester?: string | null;
  solver?: string | null;
  tokenIn?: string | null;
  tokenOut?: string | null;
  amountIn?: string | null;
  amountOut?: string | null;
  recipient?: string | null;
};

type GraphQLStats = {
  id: string;
  totalRequests: string;
  totalFulfillments: string;
  openRequests: string;
  lastUpdated: string;
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

function parseSwapStats(raw: GraphQLStats): SwapStats {
  return {
    id: raw.id,
    totalRequests: Number(raw.totalRequests),
    totalFulfillments: Number(raw.totalFulfillments),
    openRequests: Number(raw.openRequests),
    lastUpdated: Number(raw.lastUpdated),
  };
}

async function fetchRecentEvents(
  limit: number
): Promise<{ events: SwapEvent[]; totalCount: number }> {
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
      }
      SwapEvent_aggregate {
        aggregate {
          count
        }
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
    if (!res.ok) return { events: [], totalCount: 0 };
    const json = await res.json();

    if (Array.isArray(json.errors) && json.errors.length > 0) {
      return await fetchRecentEventsFallback(limit, fallbackQuery);
    }

    const events = (json.data?.SwapEvent ?? []) as GraphQLSwapEvent[];
    const aggregateRaw =
      json.data?.SwapEvent_aggregate?.aggregate?.count ??
      events.length;
    const aggregateCount = Number(aggregateRaw);
    const safeCount = Number.isFinite(aggregateCount)
      ? aggregateCount
      : events.length;
    const parsed = events.map(parseSwapEvent);
    const enriched = await enrichEventsWithRequestDetails(parsed);
    return { events: enriched, totalCount: safeCount };
  } catch {
    return { events: [], totalCount: 0 };
  }
}

async function fetchRecentEventsFallback(
  limit: number,
  fallbackQuery: string
) {
  try {
    const fallbackRes = await fetch(GRAPHQL_ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ query: fallbackQuery, variables: { limit } }),
      cache: "no-store",
    });
    if (!fallbackRes.ok) {
      return { events: [], totalCount: 0 };
    }
    const fallbackJson = await fallbackRes.json();
    if (Array.isArray(fallbackJson.errors) && fallbackJson.errors.length > 0) {
      return { events: [], totalCount: 0 };
    }
    const events = (fallbackJson.data?.SwapEvent ?? []) as GraphQLSwapEvent[];
    const parsed = events.map(parseSwapEvent);
    const enriched = await enrichEventsWithRequestDetails(parsed);
    return { events: enriched, totalCount: enriched.length };
  } catch {
    return { events: [], totalCount: 0 };
  }
}

const requestDetailsQuery = `
  query SwapRequestDetails($requestIds: [String!]) {
    SwapRequest(where: { requestId: { _in: $requestIds } }) {
      requestId
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

async function fetchRequestDetails(
  requestIds: string[]
): Promise<Record<string, GraphQLSwapRequest>> {
  if (requestIds.length === 0) {
    return {};
  }

  try {
    const res = await fetch(GRAPHQL_ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        query: requestDetailsQuery,
        variables: { requestIds },
      }),
      cache: "no-store",
    });
    if (!res.ok) return {};
    const json = await res.json();
    if (Array.isArray(json.errors) && json.errors.length > 0) {
      return {};
    }
    const requests = (json.data?.SwapRequest ?? []) as GraphQLSwapRequest[];
    return requests.reduce<Record<string, GraphQLSwapRequest>>((acc, item) => {
      acc[item.requestId] = item;
      return acc;
    }, {});
  } catch {
    return {};
  }
}

async function enrichEventsWithRequestDetails(events: SwapEvent[]): Promise<SwapEvent[]> {
  if (!events.length) return events;

  const requestIds = Array.from(
    new Set(events.map((event) => event.requestId).filter(Boolean))
  );
  const detailsMap = await fetchRequestDetails(requestIds);

  return events.map((event) => {
    const details = detailsMap[event.requestId];
    if (!details) return event;

    return {
      ...event,
      requester: event.requester ?? details.requester ?? undefined,
      solver: event.solver ?? details.solver ?? undefined,
      tokenIn: event.tokenIn ?? details.tokenIn ?? undefined,
      tokenOut: event.tokenOut ?? details.tokenOut ?? undefined,
      amountIn: event.amountIn ?? details.amountIn ?? undefined,
      amountOut: event.amountOut ?? details.amountOut ?? undefined,
      recipient: event.recipient ?? details.recipient ?? undefined,
    };
  });
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

export default async function Home({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = (await searchParams) ?? {};
  const rawLimit = Array.isArray(params.limit) ? params.limit[0] : params.limit;
  const parsedLimit = Number(rawLimit ?? 50);
  const limit =
    Number.isFinite(parsedLimit) && parsedLimit > 0
      ? Math.min(Math.floor(parsedLimit), 2000)
      : 50;

  const [{ events, totalCount }, stats] = await Promise.all([
    fetchRecentEvents(limit),
    fetchStats(),
  ]);

  const activeChains = Array.from(new Set(events.map((event) => event.chainId)));
  const crossChainPairs = new Set(
    events
      .filter((event) => event.srcChainId && event.dstChainId)
      .map((event) => `${event.srcChainId}-${event.dstChainId}`)
  );

  return (
    <div className="font-sans p-6 sm:p-10 flex flex-col gap-y-12 mt-6">
      <header className="mb-4">
        <div className="mx-auto flex max-w-2xl flex-col items-center gap-1 text-center">
          <h1 className="envio-glow text-balance text-4xl font-semibold md:text-5xl">
            onlySolvers network activity
          </h1>
          <p className="text-muted-foreground mt-4 font-mono text-sm sm:text-base">
            Live feed of swap requests and solver fulfillments across supported networks
          </p>
        </div>
      </header>

      <StatsCards
        initialStats={stats}
        initialActiveChains={activeChains}
        initialCrossChainPairs={crossChainPairs.size}
        pollMs={4000}
      />

      <section className="mx-auto w-full max-w-5xl space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-medium">Recent activity</h2>
          <p className="text-xs text-muted-foreground">
            Powered by HyperIndex • polling every 4s
          </p>
        </div>
        <RecentSwaps
          initialEvents={events}
          totalCount={totalCount}
          initialLimit={limit}
          pollMs={500}
        />
      </section>
    </div>
  );
}
