import { NextResponse, type NextRequest } from "next/server";

export const dynamic = "force-dynamic";

const INDEXER_URL =
  process.env.INDEXER_URL ||
  process.env.NEXT_PUBLIC_GRAPHQL_ENDPOINT ||
  "http://localhost:8080/v1/graphql";

type SwapEventRow = {
  id: string;
  requestId: string;
  eventType: string;
  chainId: number;
  blockNumber: number;
  blockTimestamp: number;
  txHash: string;
  srcChainId?: number | null;
  dstChainId?: number | null;
};

function csvEscape(value: unknown): string {
  const s = value == null ? "" : String(value);
  if (/[",\n]/.test(s)) {
    return '"' + s.replace(/"/g, '""') + '"';
  }
  return s;
}

function toCsv(rows: SwapEventRow[]): string {
  const header = [
    "eventType",
    "requestId",
    "txHash",
    "chainId",
    "blockNumber",
    "blockTimestamp",
    "srcChainId",
    "dstChainId",
  ].join(",");

  const lines = rows.map((x) =>
    [
      x.eventType,
      x.requestId,
      x.txHash,
      x.chainId,
      x.blockNumber,
      x.blockTimestamp,
      x.srcChainId ?? "",
      x.dstChainId ?? "",
    ]
      .map(csvEscape)
      .join(",")
  );

  const bom = "\uFEFF";
  return bom + header + "\n" + lines.join("\n");
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const requestedLimit = Number(searchParams.get("limit") ?? 1000);
    const limit = Math.max(
      1,
      Math.min(10000, Number.isFinite(requestedLimit) ? requestedLimit : 1000)
    );

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
          srcChainId
          dstChainId
        }
      }
    `;

    const upstream = await fetch(INDEXER_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ query, variables: { limit } }),
      cache: "no-store",
    });

    if (!upstream.ok) {
      return NextResponse.json(
        { error: "Upstream request failed" },
        { status: 502 }
      );
    }

    const json = await upstream.json();
    const raw = (json.data?.SwapEvent ?? []) as unknown[];
    const rows: SwapEventRow[] = raw.map((x: unknown) => {
      const item = x as Record<string, unknown>;
      return {
        id: item.id as string,
        requestId: item.swapRequest_id as string,
        eventType: item.eventType as string,
        chainId: Number(item.chainId),
        blockNumber: Number(item.blockNumber),
        blockTimestamp: Number(item.blockTimestamp),
        txHash: item.txHash as string,
        srcChainId:
          item.srcChainId === null || item.srcChainId === undefined
            ? null
            : Number(item.srcChainId),
        dstChainId:
          item.dstChainId === null || item.dstChainId === undefined
            ? null
            : Number(item.dstChainId),
      };
    });
    const csv = toCsv(rows);

    return new NextResponse(csv, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="onlyswaps_events_${limit}.csv"`,
        "Cache-Control": "no-store, max-age=0",
      },
    });
  } catch {
    return NextResponse.json(
      { error: "Failed to generate CSV" },
      { status: 500 }
    );
  }
}
