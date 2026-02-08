"use client";

import { useEffect, useState } from "react";
import { MonitorIcon, MoonIcon, SunIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useTheme } from "next-themes";

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const systemPreference = "light";
  const displayTheme = theme === "system" ? systemPreference : theme;

  const renderIcon = () => {
    if (!mounted) {
      return <SunIcon size={16} className="opacity-0" aria-hidden="true" />;
    }

    if (displayTheme === "dark") {
      return <MoonIcon size={16} aria-hidden="true" />;
    }

    return <SunIcon size={16} aria-hidden="true" />;
  };

  return (
    <div>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button size="icon" variant="outline" aria-label="Select theme">
            {renderIcon()}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent className="min-w-32">
          <DropdownMenuItem onClick={() => setTheme("light")}>
            <SunIcon size={16} className="opacity-60" aria-hidden="true" />
            <span>Light</span>
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => setTheme("dark")}>
            <MoonIcon size={16} className="opacity-60" aria-hidden="true" />
            <span>Dark</span>
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => setTheme("system")}>
            <MonitorIcon size={16} className="opacity-60" aria-hidden="true" />
            <span>System</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
