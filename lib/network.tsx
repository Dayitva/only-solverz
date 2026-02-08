import React from "react";
import {
  AvalancheIcon,
  BaseIcon,
  EthereumIcon,
  ArbitrumIcon,
  OptimismIcon,
  BscIcon,
  ScrollIcon,
} from "@/components/network-icons";

export interface NetworkIconProps {
  chainId: number;
  size?: number;
  variant?: "branded" | "mono";
  className?: string;
}

export interface IconComponentProps {
  width?: number;
  height?: number;
  className?: string;
}

type NetworkConfig = {
  chainId: number;
  name: string;
  shortName: string;
  color: string;
  explorer: {
    tx: string;
    address: string;
  };
  icon: React.ComponentType<IconComponentProps>;
};

const NETWORKS: Record<number, NetworkConfig> = {
  84532: {
    chainId: 84532,
    name: "Base Sepolia",
    shortName: "Base Sepolia",
    color: "bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-foreground",
    explorer: {
      tx: "https://sepolia.basescan.org/tx/",
      address: "https://sepolia.basescan.org/address/",
    },
    icon: BaseIcon,
  },
  43113: {
    chainId: 43113,
    name: "Avalanche Fuji",
    shortName: "Avalanche Fuji",
    color: "bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-foreground",
    explorer: {
      tx: "https://testnet.snowtrace.io/tx/",
      address: "https://testnet.snowtrace.io/address/",
    },
    icon: AvalancheIcon,
  },
  1: {
    chainId: 1,
    name: "Ethereum",
    shortName: "Ethereum",
    color: "bg-slate-100 text-slate-800 dark:bg-slate-900/40 dark:text-foreground",
    explorer: {
      tx: "https://etherscan.io/tx/",
      address: "https://etherscan.io/address/",
    },
    icon: EthereumIcon,
  },
  8453: {
    chainId: 8453,
    name: "Base",
    shortName: "Base",
    color: "bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-foreground",
    explorer: {
      tx: "https://basescan.org/tx/",
      address: "https://basescan.org/address/",
    },
    icon: BaseIcon,
  },
  43114: {
    chainId: 43114,
    name: "Avalanche",
    shortName: "Avalanche",
    color: "bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-foreground",
    explorer: {
      tx: "https://snowtrace.io/tx/",
      address: "https://snowtrace.io/address/",
    },
    icon: AvalancheIcon,
  },
  42161: {
    chainId: 42161,
    name: "Arbitrum",
    shortName: "Arbitrum",
    color: "bg-cyan-100 text-cyan-800 dark:bg-cyan-900/40 dark:text-foreground",
    explorer: {
      tx: "https://arbiscan.io/tx/",
      address: "https://arbiscan.io/address/",
    },
    icon: ArbitrumIcon,
  },
  10: {
    chainId: 10,
    name: "Optimism",
    shortName: "Optimism",
    color: "bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-foreground",
    explorer: {
      tx: "https://optimistic.etherscan.io/tx/",
      address: "https://optimistic.etherscan.io/address/",
    },
    icon: OptimismIcon,
  },
  56: {
    chainId: 56,
    name: "BNB Chain",
    shortName: "BNB Chain",
    color: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/40 dark:text-foreground",
    explorer: {
      tx: "https://bscscan.com/tx/",
      address: "https://bscscan.com/address/",
    },
    icon: BscIcon,
  },
  59144: {
    chainId: 59144,
    name: "Linea",
    shortName: "Linea",
    color: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-foreground",
    explorer: {
      tx: "https://lineascan.build/tx/",
      address: "https://lineascan.build/address/",
    },
    icon: EthereumIcon,
  },
  534352: {
    chainId: 534352,
    name: "Scroll",
    shortName: "Scroll",
    color: "bg-orange-100 text-orange-800 dark:bg-orange-900/40 dark:text-foreground",
    explorer: {
      tx: "https://scrollscan.com/tx/",
      address: "https://scrollscan.com/address/",
    },
    icon: ScrollIcon,
  },
};

export const SUPPORTED_CHAIN_IDS = Object.keys(NETWORKS).map((id) =>
  Number(id)
);

const DEFAULT_COLOR =
  "bg-gray-100 text-gray-800 dark:bg-gray-900/60 dark:text-foreground";

export function getChainName(chainId: number) {
  return NETWORKS[chainId]?.name ?? `Chain ${chainId}`;
}

export function getChainLabel(chainId: number) {
  return NETWORKS[chainId]?.shortName ?? `Chain ${chainId}`;
}

export function getChainColor(chainId: number) {
  return NETWORKS[chainId]?.color ?? DEFAULT_COLOR;
}

export function getNetworkIcon({
  chainId,
  size = 20,
  className = "",
}: NetworkIconProps): React.ReactElement | null {
  const config = NETWORKS[chainId];
  if (!config) return null;
  const IconComponent = config.icon;
  const dimension = size;
  return (
    <IconComponent
      width={dimension}
      height={dimension}
      className={className}
    />
  );
}

export function getTxUrl(chainId: number, txHash: string) {
  const explorer = NETWORKS[chainId]?.explorer;
  return explorer ? `${explorer.tx}${txHash}` : "#";
}

export function getAddressUrl(chainId: number, address: string) {
  const explorer = NETWORKS[chainId]?.explorer;
  return explorer ? `${explorer.address}${address}` : "#";
}
