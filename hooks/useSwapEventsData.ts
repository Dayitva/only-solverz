import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { SwapEvent } from "@/types";
import { SUPPORTED_CHAIN_IDS } from "@/lib/network";

type Options = {
  initialEvents: SwapEvent[];
  totalCount: number;
  page: number;
  limit: number;
  eventFilter: string;
  chainFilter: string;
  query: string;
  pollMs?: number;
  onUpdate?: (latest: SwapEvent[], previous: SwapEvent[]) => void;
};

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

function parseSwapEvent(raw: GraphQLSwapEvent): SwapEvent {
  const toNumber = (value: string | undefined | null) =>
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

export function useSwapEventsData({
  initialEvents,
  totalCount,
  page,
  limit,
  eventFilter,
  chainFilter,
  query,
  pollMs = 4000,
  onUpdate,
}: Options) {
  const [events, setEvents] = useState<SwapEvent[]>(initialEvents);
  const [total, setTotal] = useState(totalCount);
  const [loading, setLoading] = useState(false);
  const isFetchingRef = useRef(false);
  const eventsRef = useRef<SwapEvent[]>(initialEvents);

  useEffect(() => {
    setEvents(initialEvents);
    eventsRef.current = initialEvents;
  }, [initialEvents]);

  useEffect(() => {
    setTotal(totalCount);
  }, [totalCount]);

  const eventTypes =
    eventFilter === "all"
      ? ["REQUESTED", "FULFILLED"]
      : [eventFilter];
  const chainIds =
    chainFilter === "all"
      ? SUPPORTED_CHAIN_IDS
      : [Number(chainFilter)].filter((value) => Number.isFinite(value));
  const searchValue = query.trim() ? `%${query.trim()}%` : "%";
  const offset = Math.max(0, (page - 1) * limit);

  const eventTypesKey = eventTypes.join(",");
  const chainIdsKey = chainIds.join(",");

  const graphQuery = useMemo(
    () => `
      query RecentSwapEvents($limit: Int!, $offset: Int!, $eventTypes: [String!], $chainIds: [Int!], $search: String!) {
        SwapEvent(
          limit: $limit,
          offset: $offset,
          order_by: { blockTimestamp: desc },
          where: {
            _and: [
              { eventType: { _in: $eventTypes } },
              { chainId: { _in: $chainIds } },
              {
                _or: [
                  { swapRequest_id: { _ilike: $search } },
                  { txHash: { _ilike: $search } }
                ]
              }
            ]
          }
        ) {
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
        SwapEvent_aggregate(
          where: {
            _and: [
              { eventType: { _in: $eventTypes } },
              { chainId: { _in: $chainIds } },
              {
                _or: [
                  { swapRequest_id: { _ilike: $search } },
                  { txHash: { _ilike: $search } }
                ]
              }
            ]
          }
        ) {
          aggregate {
            count
          }
        }
      }
    `,
    []
  );

  const fallbackQuery = useMemo(
    () => `
      query RecentSwapEventsFallback($limit: Int!, $offset: Int!, $eventTypes: [String!], $chainIds: [Int!], $search: String!) {
        SwapEvent(
          limit: $limit,
          offset: $offset,
          order_by: { blockTimestamp: desc },
          where: {
            _and: [
              { eventType: { _in: $eventTypes } },
              { chainId: { _in: $chainIds } },
              {
                _or: [
                  { swapRequest_id: { _ilike: $search } },
                  { txHash: { _ilike: $search } }
                ]
              }
            ]
          }
        ) {
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
        SwapEvent_aggregate(
          where: {
            _and: [
              { eventType: { _in: $eventTypes } },
              { chainId: { _in: $chainIds } },
              {
                _or: [
                  { swapRequest_id: { _ilike: $search } },
                  { txHash: { _ilike: $search } }
                ]
              }
            ]
          }
        ) {
          aggregate {
            count
          }
        }
      }
    `,
    []
  );

  const requestDetailsQuery = useMemo(
    () => `
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
    `,
    []
  );

  const fetchRequestDetails = useCallback(async (requestIds: string[]): Promise<Record<string, GraphQLSwapRequest>> => {
    if (requestIds.length === 0) return {};
    try {
      const res = await fetch("/api/graphql", {
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
  }, [requestDetailsQuery]);

  const enrichWithDetails = useCallback(async (list: SwapEvent[]): Promise<SwapEvent[]> => {
    if (!list.length) return list;
    const requestIds = Array.from(new Set(list.map((item) => item.requestId)));
    const details = await fetchRequestDetails(requestIds);
    return list.map((event) => {
      const detail = details[event.requestId];
      if (!detail) return event;
      return {
        ...event,
        requester: event.requester ?? detail.requester ?? undefined,
        solver: event.solver ?? detail.solver ?? undefined,
        tokenIn: event.tokenIn ?? detail.tokenIn ?? undefined,
        tokenOut: event.tokenOut ?? detail.tokenOut ?? undefined,
        amountIn: event.amountIn ?? detail.amountIn ?? undefined,
        amountOut: event.amountOut ?? detail.amountOut ?? undefined,
        recipient: event.recipient ?? detail.recipient ?? undefined,
      };
    });
  }, [fetchRequestDetails]);

  useEffect(() => {
    let aborted = false;

    async function poll() {
      if (isFetchingRef.current) return;
      isFetchingRef.current = true;
      setLoading(true);
      try {
        const res = await fetch("/api/graphql", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            query: graphQuery,
            variables: {
              limit,
              offset,
              eventTypes,
              chainIds,
              search: searchValue,
            },
          }),
          cache: "no-store",
        });
        if (!res.ok) return;
        const json = await res.json();
        if (aborted) return;

        let effectiveJson = json;

        if (Array.isArray(json.errors) && json.errors.length > 0) {
          const fallbackRes = await fetch("/api/graphql", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              query: fallbackQuery,
              variables: {
                limit,
                offset,
                eventTypes,
                chainIds,
                search: searchValue,
              },
            }),
            cache: "no-store",
          });
          if (!fallbackRes.ok) return;
          const fallbackJson = await fallbackRes.json();
          if (aborted) return;
          if (Array.isArray(fallbackJson.errors) && fallbackJson.errors.length > 0) {
            return;
          }
          effectiveJson = fallbackJson;
        }

        const raw = (effectiveJson.data?.SwapEvent ?? []) as GraphQLSwapEvent[];
        let latest = raw.map(parseSwapEvent);
        latest = await enrichWithDetails(latest);
        const aggregateRaw =
          effectiveJson.data?.SwapEvent_aggregate?.aggregate?.count;
        const aggregateCount = Number(aggregateRaw);
        const safeCount = Number.isFinite(aggregateCount)
          ? aggregateCount
          : latest.length;

        const previous = eventsRef.current;
        const hasChange =
          latest.length !== previous.length || latest[0]?.id !== previous[0]?.id;

        if (hasChange) {
          onUpdate?.(latest, previous);
          setEvents(latest);
          eventsRef.current = latest;
        }
        setTotal(safeCount);
      } catch {
        // ignore network errors
      } finally {
        if (!aborted) {
          setLoading(false);
        }
        isFetchingRef.current = false;
      }
    }

    poll();
    const intervalId = setInterval(poll, pollMs);
    return () => {
      aborted = true;
      clearInterval(intervalId);
    };
  }, [
    graphQuery,
    limit,
    offset,
    eventTypesKey,
    chainIdsKey,
    searchValue,
    pollMs,
    onUpdate,
    fallbackQuery,
    requestDetailsQuery,
    enrichWithDetails,
  ]);

  return { events, total, loading };
}


