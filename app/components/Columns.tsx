"use client";

import Link from "next/link";
import type { ColumnDef } from "@tanstack/react-table";
import { BadgeCheckIcon, MessageSquareIcon } from "lucide-react";

import type { SwapEvent } from "@/types";
import {
  getChainColor,
  getChainLabel,
  getNetworkIcon,
  getTxUrl,
} from "@/lib/network";
import { searchFilterFn } from "@/lib/table";
import {
  cn,
  formatAddress,
  formatBigAmount,
  formatRequestId,
  formatTimestamp,
  formatTokenAddress,
  formatTokenLabel,
} from "@/lib/utils";
import { RelativeTime } from "@/app/components/RelativeTime";

const EVENT_META: Record<
  SwapEvent["eventType"],
  { label: string; icon: React.ComponentType<{ className?: string }> }
> = {
  REQUESTED: {
    label: "Swap Requested",
    icon: MessageSquareIcon,
  },
  FULFILLED: {
    label: "Swap Fulfilled",
    icon: BadgeCheckIcon,
  },
};

export const columns: ColumnDef<SwapEvent>[] = [
  {
    accessorKey: "eventType",
    header: "Event",
    size: 160,
    filterFn: (row, id, value) => {
      if (!value || value === "all") return true;
      return row.getValue(id) === value;
    },
    cell: ({ row }) => {
      const eventType = row.original.eventType;
      const meta = EVENT_META[eventType];
      const Icon = meta.icon;
      return (
        <div className="flex items-center gap-2">
          <span
            className={cn(
              "inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-medium",
              eventType === "FULFILLED"
                ? "border-green-200 bg-green-100 text-green-800 dark:border-green-900/50 dark:bg-green-900/30 dark:text-green-100"
                : "border-blue-200 bg-blue-100 text-blue-800 dark:border-blue-900/50 dark:bg-blue-900/30 dark:text-blue-100"
            )}
          >
            <Icon className="size-3.5" />
            {meta.label}
          </span>
        </div>
      );
    },
  },
  {
    accessorKey: "requestId",
    header: "Request ID",
    size: 220,
    filterFn: searchFilterFn,
    cell: ({ row }) => {
      const { requestId } = row.original;
      const logIndex = row.original.logIndex;
      return (
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2">
            <span className="font-mono text-sm">{formatRequestId(requestId)}</span>
            <button
              type="button"
              onClick={() => navigator.clipboard.writeText(requestId)}
              className="rounded border px-1.5 py-0.5 text-[10px] uppercase tracking-wide text-muted-foreground transition hover:bg-muted"
            >
              Copy
            </button>
          </div>
          <span className="text-xs text-muted-foreground">
            {logIndex != null ? `Log #${logIndex}` : "Awaiting confirmation"}
          </span>
        </div>
      );
    },
  },
  {
    id: "route",
    header: "Route",
    size: 220,
    cell: ({ row }) => {
      const { srcChainId, dstChainId } = row.original;
      if (!srcChainId && !dstChainId) {
        return <span className="text-muted-foreground text-sm">—</span>;
      }
      return (
        <div className="flex items-center gap-1.5">
          {srcChainId && (
            <span className="inline-flex items-center gap-1 rounded-md border bg-muted/50 px-1.5 py-0.5 text-xs font-medium">
              {getNetworkIcon({ chainId: srcChainId, size: 12 })}
              <span className="whitespace-nowrap">{getChainLabel(srcChainId)}</span>
            </span>
          )}
          {srcChainId && dstChainId && (
            <span className="text-muted-foreground text-xs font-medium">→</span>
          )}
          {dstChainId && (
            <span className="inline-flex items-center gap-1 rounded-md border bg-muted/50 px-1.5 py-0.5 text-xs font-medium">
              {getNetworkIcon({ chainId: dstChainId, size: 12 })}
              <span className="whitespace-nowrap">{getChainLabel(dstChainId)}</span>
            </span>
          )}
        </div>
      );
    },
  },
  {
    id: "assets",
    header: "Assets",
    size: 240,
    cell: ({ row }) => {
      const { tokenIn, tokenOut, amountIn, amountOut, eventType } = row.original;
      if (!tokenIn && !tokenOut && !amountIn && !amountOut) {
        return <span className="text-muted-foreground text-sm">—</span>;
      }

      return (
        <div className="flex flex-col gap-1 text-xs">
          {(tokenIn || amountIn) && (
            <div className="flex items-center gap-2">
              <span className="rounded bg-muted px-2 py-0.5 font-medium uppercase">In</span>
              <span className="font-mono">
                {formatBigAmount(amountIn, tokenIn, 3)}{" "}
                <span className="text-muted-foreground">
                  {formatTokenLabel(tokenIn)}
                </span>
              </span>
            </div>
          )}
          {(tokenOut || amountOut) && (
            <div className="flex items-center gap-2">
              <span className="rounded bg-muted px-2 py-0.5 font-medium uppercase">
                {eventType === "FULFILLED" ? "Out" : "Target"}
              </span>
              <span className="font-mono">
                {formatBigAmount(amountOut ?? amountIn, tokenOut ?? tokenIn, 3)}{" "}
                <span className="text-muted-foreground">
                  {formatTokenLabel(tokenOut ?? tokenIn)}
                </span>
              </span>
            </div>
          )}
        </div>
      );
    },
  },
  {
    accessorKey: "chainId",
    header: "Observed On",
    size: 180,
    filterFn: (row, id, value) => {
      if (!value || value === "all") return true;
      return row.getValue<number>(id) === Number(value);
    },
    cell: ({ row }) => {
      const chainId = row.original.chainId;
      return (
        <div
          className={cn(
            "inline-flex items-center gap-2 rounded-full px-2 py-1 text-xs font-medium",
            getChainColor(chainId)
          )}
        >
          {getNetworkIcon({ chainId, size: 14, variant: "mono" })}
          {getChainLabel(chainId)}
        </div>
      );
    },
  },
  {
    id: "participants",
    header: "Participants",
    size: 240,
    cell: ({ row }) => {
      const { requester, solver, recipient, eventType } = row.original;
      return (
        <div className="flex flex-col gap-1 text-xs">
          {requester && (
            <div>
              <span className="text-muted-foreground">Requester</span>{" "}
              <span className="font-mono">{formatAddress(requester, 4)}</span>
            </div>
          )}
          {recipient && (
            <div>
              <span className="text-muted-foreground">Recipient</span>{" "}
              <span className="font-mono">{formatAddress(recipient, 4)}</span>
            </div>
          )}
          {eventType === "FULFILLED" && solver && (
            <div>
              <span className="text-muted-foreground">Solver</span>{" "}
              <span className="font-mono text-green-500 dark:text-green-300">
                {formatAddress(solver, 4)}
              </span>
            </div>
          )}
        </div>
      );
    },
  },
  {
    accessorKey: "blockTimestamp",
    header: "Timestamp",
    size: 210,
    sortingFn: (a, b) =>
      Number(a.original.blockTimestamp) - Number(b.original.blockTimestamp),
    cell: ({ row }) => {
      const ts = row.original.blockTimestamp;
      return (
        <div className="flex flex-col">
          <span className="text-sm font-medium">
            {formatTimestamp(ts)}
          </span>
          <span className="text-xs text-muted-foreground">
            <RelativeTime timestamp={ts} />
          </span>
        </div>
      );
    },
  },
  {
    accessorKey: "txHash",
    header: "Transaction",
    size: 220,
    cell: ({ row }) => {
      const { txHash, chainId } = row.original;
      return (
        <div className="flex flex-col">
          <Link
            href={getTxUrl(chainId, txHash)}
            target="_blank"
            rel="noreferrer noopener"
            className="font-mono text-sm text-primary underline-offset-4 hover:underline"
          >
            {formatAddress(txHash, 6)}
          </Link>
          <span className="text-xs text-muted-foreground">
            Block #{row.original.blockNumber}
          </span>
        </div>
      );
    },
  },
];
