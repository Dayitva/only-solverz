import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const TIMESTAMP_FORMATTER = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
  hour12: false,
  timeZone: "UTC",
});

export function formatAddress(addr?: string | null, size: number = 4) {
  if (!addr) return "—";
  return `${addr.slice(0, 2 + size)}…${addr.slice(-size)}`;
}

export function formatRequestId(id?: string | null) {
  if (!id) return "—";
  return `${id.slice(0, 6)}…${id.slice(-6)}`;
}

export function formatTimestamp(value: number | string | bigint | null) {
  if (value == null) return "—";
  const numeric =
    typeof value === "bigint" ? Number(value) : Number.parseInt(String(value), 10);
  if (!Number.isFinite(numeric)) return String(value);
  const ms = numeric > 1e12 ? numeric : numeric * 1000;
  const date = new Date(ms);
  return TIMESTAMP_FORMATTER.format(date);
}

export function formatRelativeTime(value: number | string | bigint | null) {
  if (value == null) return "—";
  const numeric =
    typeof value === "bigint" ? Number(value) : Number.parseInt(String(value), 10);
  if (!Number.isFinite(numeric)) return "—";
  const ms = numeric > 1e12 ? numeric : numeric * 1000;
  const delta = Date.now() - ms;
  const formatter = new Intl.RelativeTimeFormat(undefined, { numeric: "auto" });
  const seconds = Math.round(delta / 1000);
  if (Math.abs(seconds) < 60) {
    return formatter.format(-seconds, "second");
  }
  const minutes = Math.round(seconds / 60);
  if (Math.abs(minutes) < 60) {
    return formatter.format(-minutes, "minute");
  }
  const hours = Math.round(minutes / 60);
  if (Math.abs(hours) < 24) {
    return formatter.format(-hours, "hour");
  }
  const days = Math.round(hours / 24);
  return formatter.format(-days, "day");
}

export function formatNumber(value?: number, fractionDigits = 0) {
  if (value == null || !Number.isFinite(value)) return "—";
  return value.toLocaleString(undefined, {
    maximumFractionDigits: fractionDigits,
  });
}

export function formatTime(value?: string | number | bigint | null) {
  if (value == null) return "—";
  return formatTimestamp(value);
}

function toBigIntOrUndefined(value?: string | number | bigint | null) {
  if (value == null) return undefined;
  try {
    if (typeof value === "bigint") return value;
    if (typeof value === "number") return BigInt(Math.trunc(value));
    const normalized = String(value).trim();
    if (!normalized) return undefined;
    return BigInt(normalized);
  } catch {
    return undefined;
  }
}

const TOKEN_DECIMALS: Record<string, number> = {
  "0x908e1d85604e0e9e703d52d18f3f3f604fe7bb1b": 18, // RUSD
  "0xfde4c96c8593536e31f229ea8f37b2ada2699bb2": 6,  // USDT (Base)
  "0x9702230a8ea53601f5cd2dc00fdbc13d4df4a8c7": 6,  // USDT (Avalanche)
  "0xdac17f958d2ee523a2206206994597c13d831ec7": 6,  // USDT (Ethereum)
  "0xfd086bc7cd5c481dcc9c85ebe478a1c0b69fcbb9": 6,  // USDT (Arbitrum)
};

const TOKEN_SYMBOLS: Record<string, string> = {
  "0x908e1d85604e0e9e703d52d18f3f3f604fe7bb1b": "RUSD",
  "0xfde4c96c8593536e31f229ea8f37b2ada2699bb2": "USDT",
  "0x9702230a8ea53601f5cd2dc00fdbc13d4df4a8c7": "USDT",
  "0xdac17f958d2ee523a2206206994597c13d831ec7": "USDT",
  "0xfd086bc7cd5c481dcc9c85ebe478a1c0b69fcbb9": "USDT",
};

function normalizeTokenAmount(raw?: string | number | bigint | null, token?: string | null, precision: number = 3) {
  const bigintValue = toBigIntOrUndefined(raw);
  if (bigintValue === undefined) return "—";
  const decimals = token ? TOKEN_DECIMALS[token.toLowerCase()] ?? 18 : 18;
  const divisor = BigInt(10) ** BigInt(decimals);
  const integerPart = bigintValue / divisor;
  const fractionalPart = Number(bigintValue % divisor) / Number(divisor);
  const total = Number(integerPart) + fractionalPart;
  return total.toLocaleString(undefined, {
    minimumFractionDigits: 0,
    maximumFractionDigits: precision,
  });
}

export function formatBigAmount(value?: string | number | bigint | null, token?: string | null, precision = 3) {
  return normalizeTokenAmount(value, token, precision);
}

export function formatTokenLabel(addr?: string | null) {
  if (!addr) return "—";
  const symbol = TOKEN_SYMBOLS[addr.toLowerCase()];
  return symbol ?? formatAddress(addr, 4);
}

export function formatTokenAddress(addr?: string | null, size: number = 4) {
  if (!addr) return "—";
  const symbol = TOKEN_SYMBOLS[addr.toLowerCase()];
  return symbol ?? formatAddress(addr, size);
}
