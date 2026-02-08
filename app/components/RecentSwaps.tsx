"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  ColumnFiltersState,
  SortingState,
  VisibilityState,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getSortedRowModel,
  useReactTable,
} from "@tanstack/react-table";
import { FilterIcon, SearchIcon } from "lucide-react";

import type { SwapEvent } from "@/types";
import { useSwapEventsData } from "@/hooks/useSwapEventsData";
import { columns } from "./Columns";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { RelativeTime } from "@/app/components/RelativeTime";
import { SUPPORTED_CHAIN_IDS, getChainLabel } from "@/lib/network";
import { cn } from "@/lib/utils";

type Props = {
  initialEvents: SwapEvent[];
  totalCount: number;
  initialLimit: number;
  pollMs?: number;
};

const EVENT_FILTERS = [
  { value: "all", label: "All activity" },
  { value: "REQUESTED", label: "Request events" },
  { value: "FULFILLED", label: "Fulfillments" },
];

export default function RecentSwaps({
  initialEvents,
  totalCount,
  initialLimit,
  pollMs = 4000,
}: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [sorting, setSorting] = useState<SortingState>([
    { id: "blockTimestamp", desc: true },
  ]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({});
  const [eventFilter, setEventFilter] = useState<string>(
    searchParams.get("eventType") ?? "all"
  );
  const [chainFilter, setChainFilter] = useState<string>(
    searchParams.get("chainId") ?? "all"
  );
  const [searchTerm, setSearchTerm] = useState(
    searchParams.get("query") ?? ""
  );
  const [pageSize, setPageSize] = useState(initialLimit);
  const audioContextRef = useRef<AudioContext | null>(null);
  const highlightTimersRef = useRef<Map<string, number>>(new Map());
  const [highlightedIds, setHighlightedIds] = useState<Set<string>>(new Set());

  const handleLimitChange = useCallback(
    (value: string) => {
      setPageSize(Number(value));
      const params = new URLSearchParams(searchParams.toString());
      params.set("limit", value);
      router.replace(`?${params.toString()}`);
    },
    [router, searchParams]
  );

  const playSound = useCallback((type: SwapEvent["eventType"]) => {
    const audioCtor =
      window.AudioContext ||
      (typeof window !== "undefined" &&
        (window as unknown as { webkitAudioContext?: typeof AudioContext })
          .webkitAudioContext);
    if (!audioCtor) return;

    const ctx = audioContextRef.current ?? new audioCtor();
    audioContextRef.current = ctx;

    const now = ctx.currentTime;
    const freqs = type === "FULFILLED" ? [440, 660, 880] : [320, 420];
    freqs.forEach((freq, index) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.value = freq;
      const start = now + index * 0.03;
      const duration = type === "FULFILLED" ? 0.25 : 0.18;
      gain.gain.setValueAtTime(type === "FULFILLED" ? 0.15 : 0.12, start);
      gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(start);
      osc.stop(start + duration);
    });
  }, []);

  const scheduleHighlightRemoval = useCallback((ids: string[]) => {
    if (!ids.length) return;
    ids.forEach((id) => {
      const timers = highlightTimersRef.current;
      const existing = timers.get(id);
      if (existing) {
        window.clearTimeout(existing);
      }
      const timeoutId = window.setTimeout(() => {
        setHighlightedIds((prev) => {
          const next = new Set(prev);
          next.delete(id);
          return next;
        });
        timers.delete(id);
      }, 1600);
      timers.set(id, timeoutId);
    });
  }, []);

  const registerHighlights = useCallback(
    (ids: string[]) => {
      if (!ids.length) return;
      setHighlightedIds((prev) => {
        const next = new Set(prev);
        ids.forEach((id) => next.add(id));
        return next;
      });
      scheduleHighlightRemoval(ids);
    },
    [scheduleHighlightRemoval]
  );

  const { events, total, loading } = useSwapEventsData({
    initialEvents,
    totalCount,
    page: 1,
    limit: pageSize,
    eventFilter,
    chainFilter,
    query: searchTerm,
    pollMs,
    onUpdate: (latest, previous) => {
      const previousIds = new Set(previous.map((item) => item.id));
      const newEvents = latest.filter((item) => !previousIds.has(item.id));
      if (newEvents.length) {
        newEvents.forEach((event) => playSound(event.eventType));
        registerHighlights(newEvents.map((event) => event.id));
      }
    },
  });

  useEffect(
    () => () => {
      highlightTimersRef.current.forEach((timeoutId) => {
        window.clearTimeout(timeoutId);
      });
      highlightTimersRef.current.clear();
    },
    []
  );

  const chainOptions = useMemo(
    () =>
      SUPPORTED_CHAIN_IDS.map((chainId) => ({
        chainId,
        label: getChainLabel(chainId),
      })),
    []
  );

  const table = useReactTable({
    data: events,
    columns,
    state: {
      sorting,
      columnFilters,
      columnVisibility,
    },
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onColumnVisibilityChange: setColumnVisibility,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
  });

  const applyFilters = useCallback(
    (eventTypeValue: string, chainValue: string) => {
      table.getColumn("eventType")?.setFilterValue(eventTypeValue);
      table.getColumn("chainId")?.setFilterValue(chainValue);
    },
    [table]
  );

  useEffect(() => {
    applyFilters(eventFilter, chainFilter);
  }, [applyFilters, eventFilter, chainFilter]);

  useEffect(() => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("limit", String(pageSize));
    params.set("eventType", eventFilter);
    params.set("chainId", chainFilter);
    if (searchTerm) {
      params.set("query", searchTerm);
    } else {
      params.delete("query");
    }
    router.replace(`?${params.toString()}`, { scroll: false });
  }, [pageSize, eventFilter, chainFilter, searchTerm, router, searchParams]);

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="relative w-full sm:w-72">
            <Input
              placeholder="Search request id or transaction…"
              value={searchTerm}
              onChange={(event) => {
                const value = event.target.value;
                setSearchTerm(value);
                table
                  .getColumn("requestId")
                  ?.setFilterValue(value.trim().toLowerCase());
              }}
              className="ps-8"
            />
            <SearchIcon className="absolute left-2.5 top-2.5 size-4 text-muted-foreground" />
          </div>
          <div className="flex items-center gap-2">
            <FilterIcon className="size-4 text-muted-foreground" />
            <Select
              value={eventFilter}
              onValueChange={(value) => setEventFilter(value)}
            >
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Event type" />
              </SelectTrigger>
              <SelectContent>
                {EVENT_FILTERS.map((filter) => (
                  <SelectItem key={filter.value} value={filter.value}>
                    {filter.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select
              value={chainFilter}
              onValueChange={(value) => setChainFilter(value)}
            >
              <SelectTrigger className="w-44">
                <SelectValue placeholder="Observed chain" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All chains</SelectItem>
                {chainOptions.map(({ chainId, label }) => (
                  <SelectItem key={chainId} value={String(chainId)}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="hidden text-sm text-muted-foreground sm:block">
            Updated{" "}
            <RelativeTime
              timestamp={events[0]?.blockTimestamp}
              placeholder="—"
            />
          </div>
          <div className="flex items-center gap-2">
            <Label htmlFor="results-per-page" className="text-sm">
              Results
            </Label>
            <Select
              value={String(pageSize)}
              onValueChange={(value) => handleLimitChange(value)}
            >
              <SelectTrigger id="results-per-page" className="w-24">
                <SelectValue placeholder="Limit" />
              </SelectTrigger>
              <SelectContent>
                {[25, 50, 100, 250, 500, 1000, 2000].map((option) => (
                  <SelectItem key={option} value={String(option)}>
                    {option}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      <div className="rounded-lg border bg-card">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id} className="bg-muted/60 hover:bg-muted/60">
                {headerGroup.headers.map((header) => (
                  <TableHead
                    key={header.id}
                    style={{
                      width: header.getSize() ? `${header.getSize()}px` : undefined,
                    }}
                  >
                    {header.isPlaceholder
                      ? null
                      : flexRender(
                          header.column.columnDef.header,
                          header.getContext()
                        )}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow
                  key={row.id}
                  className={cn(
                    highlightedIds.has(row.original.id) && "new-event-row"
                  )}
                >
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id}>
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell
                  colSpan={columns.length}
                  className="h-24 text-center text-muted-foreground"
                >
                  No swap events found.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between text-xs text-muted-foreground">
        <div>Showing {table.getRowCount()} of {total} events</div>
        <div className="flex items-center gap-2">
          <span>{loading ? "Refreshing…" : "Polling every 4s"}</span>
        </div>
      </div>
    </div>
  );
}


