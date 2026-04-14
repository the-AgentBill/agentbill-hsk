export { init, getState, type AgentBillHskConfig } from "./state.js";
export { requirePayment, type RequirePaymentOptions } from "./middleware.js";
export { createPayingClient, type PayingClientConfig, type PayingClient } from "./client.js";
export { NETWORK_IDS, USDC_ADDRESSES, CHAINS, hashkeyMainnet, hashkeyTestnet, type NetworkName } from "./networks.js";

// Namespace export (mirrors agentbill-base API)
import { init, getState } from "./state.js";
export const agentBill = { init, getState };
