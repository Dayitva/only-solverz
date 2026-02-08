"use client";

import { useEffect, useState } from "react";

import { formatRelativeTime } from "@/lib/utils";

type RelativeTimeProps = {
  timestamp?: number;
  placeholder?: string;
  className?: string;
  intervalMs?: number;
};

export function RelativeTime({
  timestamp,
  placeholder = "—",
  className,
  intervalMs = 30_000,
}: RelativeTimeProps) {
  const [value, setValue] = useState(placeholder);

  useEffect(() => {
    if (timestamp == null || Number.isNaN(timestamp)) {
      setValue(placeholder);
      return;
    }

    let cancelled = false;

    const update = () => {
      const formatted = formatRelativeTime(timestamp);
      if (!cancelled) {
        setValue(formatted);
      }
    };

    update();
    const id = window.setInterval(update, intervalMs);
    return () => {
      cancelled = true;
      window.clearInterval(id);
    };
  }, [timestamp, placeholder, intervalMs]);

  return <span className={className}>{value}</span>;
}

