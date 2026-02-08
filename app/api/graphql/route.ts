import { NextResponse, type NextRequest } from "next/server";

const INDEXER_URL =
  process.env.INDEXER_URL ||
  process.env.NEXT_PUBLIC_GRAPHQL_ENDPOINT ||
  "http://localhost:8080/v1/graphql";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const response = await fetch(INDEXER_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      cache: "no-store",
    });

    const text = await response.text();
    return new NextResponse(text, {
      status: response.status,
      headers: { "Content-Type": "application/json" },
    });
  } catch {
    return NextResponse.json(
      { error: "Upstream request failed" },
      { status: 502 }
    );
  }
}

export function GET() {
  return NextResponse.json({ error: "Method Not Allowed" }, { status: 405 });
}
