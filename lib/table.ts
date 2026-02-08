import { SwapEvent } from "@/types";
import { FilterFn } from "@tanstack/react-table";

export const searchFilterFn: FilterFn<SwapEvent> = (
  row,
  _columnId,
  filterValue
) => {
  const searchTerm = String(filterValue ?? "").trim().toLowerCase();
  if (!searchTerm) return true;

  const haystack = [
    row.original.requestId,
    row.original.txHash,
    row.original.chainId,
    row.original.srcChainId,
    row.original.dstChainId,
  ]
    .filter(Boolean)
    .map((value) => String(value).toLowerCase())
    .join(" ");

  return haystack.includes(searchTerm);
};

export const eventTypeFilterFn: FilterFn<SwapEvent> = (
  row,
  columnId,
  filterValue: string
) => {
  if (!filterValue || filterValue === "all") return true;
  return row.getValue(columnId) === filterValue;
};

export const chainFilterFn: FilterFn<SwapEvent> = (
  row,
  columnId,
  filterValue: string
) => {
  if (!filterValue || filterValue === "all") return true;
  const chainId = Number(row.getValue(columnId));
  return chainId === Number(filterValue);
};
