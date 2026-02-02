export type SwapEventType = "REQUESTED" | "FULFILLED";

export type SwapEvent = {
  id: string;
  requestId: string;
  eventType: SwapEventType;
  chainId: number;
  blockNumber: number;
  blockTimestamp: number;
  txHash: string;
  logIndex?: number;
  srcChainId?: number;
  dstChainId?: number;
  requester?: string;
  solver?: string;
  tokenIn?: string;
  tokenOut?: string;
  amountIn?: string;
  amountOut?: string;
  recipient?: string;
};

export type SwapStats = {
  id: string;
  totalRequests: number;
  totalFulfillments: number;
  openRequests: number;
  lastUpdated: number;
};
