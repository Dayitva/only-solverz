"use client";

import { useState } from "react";
import { DownloadIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

type Props = {
  defaultLimit?: number;
  className?: string;
};

export default function DownloadCsv({ defaultLimit = 1000, className }: Props) {
  const [isBusy, setIsBusy] = useState(false);
  const disabled = isBusy;
  const [open, setOpen] = useState(false);

  async function beginDownload() {
    if (disabled) return;
    try {
      setIsBusy(true);
      const downloadLink = `${window.location.origin}/api/export?limit=${defaultLimit}`;
      const res = await fetch(downloadLink, { method: "GET" });
      if (!res.ok) {
        alert("Failed to generate CSV. Please try again.");
        return;
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `liqo_recent_${defaultLimit}.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } finally {
      setIsBusy(false);
    }
  }

  return (
    <div className={className}>
      <Popover open={open} onOpenChange={(v) => setOpen(v)}>
        <PopoverTrigger asChild>
          <Button
            onClick={() => {
              setOpen(true);
              setTimeout(() => setOpen(false), 3500);
            }}
            disabled={disabled}
            className="transition-opacity hover:opacity-70"
            title="Reach out to jonjon@envio.dev for all liquidations data"
          >
            <DownloadIcon
              className="-ms-1 opacity-60"
              size={16}
              aria-hidden="true"
            />
            {isBusy ? "Preparing…" : "Download CSV"}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto min-w-64 p-3" align="end">
          <div className="text-xs text-muted-foreground space-y-2">
            <p>
              Download the most recent {defaultLimit} liquidations. For the full
              dataset and enquiries, reach out to jonjon@envio.dev.
            </p>
            <div>
              <Button
                variant="outline"
                size="sm"
                onClick={async () => {
                  await beginDownload();
                  setOpen(false);
                }}
                disabled={disabled}
              >
                {isBusy ? "Preparing…" : `Confirm download (${defaultLimit})`}
              </Button>
            </div>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}
