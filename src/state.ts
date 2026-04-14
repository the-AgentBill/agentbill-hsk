/**
 * Singleton state for AgentBill HSK.
 * Call init() once at server startup.
 */
import { x402ResourceServer } from "@x402/express";
import { registerExactEvmScheme } from "@x402/evm/exact/server";
import { createHashKeyFacilitator } from "./facilitator.js";
import { NETWORK_IDS, type NetworkName } from "./networks.js";

export interface AgentBillHskConfig {
  /** Wallet address that receives USDC payments */
  receivingAddress: `0x${string}`;
  /** HashKey Chain network to use */
  network: NetworkName;
  /**
   * Private key for the facilitator wallet.
   * This wallet submits Permit2.permitTransferFrom() on-chain and needs HSK for gas.
   * Defaults to FACILITATOR_PRIVATE_KEY env var.
   */
  facilitatorPrivateKey?: `0x${string}`;
}

let _config: AgentBillHskConfig | null = null;
let _server: x402ResourceServer | null = null;

export function init(config: AgentBillHskConfig): void {
  const facilitatorKey =
    config.facilitatorPrivateKey ??
    (process.env.FACILITATOR_PRIVATE_KEY as `0x${string}` | undefined);

  if (!facilitatorKey) {
    throw new Error(
      "AgentBill HSK: facilitatorPrivateKey is required. " +
        "Set it in config or via FACILITATOR_PRIVATE_KEY env var."
    );
  }

  if (!NETWORK_IDS[config.network]) {
    throw new Error(`AgentBill HSK: unsupported network "${config.network}"`);
  }

  const facilitatorClient = createHashKeyFacilitator(
    [config.network],
    facilitatorKey
  );

  const server = new x402ResourceServer(facilitatorClient);
  registerExactEvmScheme(server);

  _config = config;
  _server = server;
}

export function getState(): {
  config: AgentBillHskConfig;
  server: x402ResourceServer;
} {
  if (!_config || !_server) {
    throw new Error("AgentBill HSK not initialized. Call agentBill.init() first.");
  }
  return { config: _config, server: _server };
}
