"use client";

import { useState } from "react";
import { Check, Copy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type CopyButtonProps = {
  text: string;
  ariaLabel?: string;
  className?: string;
};

export default function CopyButton({
  text,
  ariaLabel,
  className,
}: CopyButtonProps) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      const t = setTimeout(() => setCopied(false), 1200);
      return () => clearTimeout(t);
    } catch {
      // no-op
    }
  }

  return (
    <Button
      type="button"
      variant="outline"
      onClick={handleCopy}
      aria-label={ariaLabel ?? "Copy"}
      title={ariaLabel ?? "Copy"}
      className={cn("size-6", className)}
    >
      {copied ? (
        <Check className="size-3.5 text-green-500" />
      ) : (
        <Copy className="size-3.5" />
      )}
    </Button>
  );
}
