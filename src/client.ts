/**
 * Payment-enabled fetch client for AI agents on HashKey Chain.
 *
 * Handles the full x402 flow automatically:
 *   1. Calls endpoint → gets 402
 *   2. Signs Permit2 SignatureTransfer authorization
 *   3. Retries with payment header → gets 200
 *
 * One-time setup: approves the Permit2 contract to spend USDC on first use.
 */
import { wrapFetchWithPayment, x402Client } from "@x402/fetch";
import { registerExactEvmScheme } from "@x402/evm/exact/client";
import { createWalletClient, http, publicActions, maxUint256 } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { CHAINS, USDC_ADDRESSES, NETWORK_IDS, type NetworkName } from "./networks.js";

const ERC20_ABI = [
  {
    name: "approve",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [
      { name: "spender", type: "address" },
      { name: "amount", type: "uint256" },
    ],
    outputs: [{ name: "", type: "bool" }],
  },
  {
    name: "allowance",
    type: "function",
    stateMutability: "view",
    inputs: [
      { name: "owner", type: "address" },
      { name: "spender", type: "address" },
    ],
    outputs: [{ name: "", type: "uint256" }],
  },
] as const;

const PERMIT2_ADDRESS = "0x000000000022D473030F116dDEE9F6B43aC78BA3" as const;

export interface PayingClientConfig {
  /** Private key of the agent's wallet */
  privateKey: `0x${string}`;
  /** HashKey Chain network */
  network: NetworkName;
  /**
   * If true, automatically approves Permit2 to spend USDC on first use.
   * Requires a small amount of HSK for the approval transaction.
   * @default true
   */
  autoApprovePermit2?: boolean;
}

export interface PayingClient {
  /** Drop-in fetch replacement — handles 402 automatically */
  fetch: typeof globalThis.fetch;
  /** Wallet address of this agent */
  address: `0x${string}`;
  /**
   * Manually trigger the one-time Permit2 approval for USDC.
   * Called automatically by fetch() if autoApprovePermit2 is true.
   */
  approvePermit2: () => Promise<`0x${string}` | null>;
}

/**
 * Creates a paying fetch client for HashKey Chain.
 *
 * @example
 * const client = createPayingClient({
 *   privateKey: process.env.AGENT_PRIVATE_KEY,
 *   network: "hashkey-testnet",
 * });
 * const response = await client.fetch("https://api.example.com/data");
 */
export function createPayingClient(config: PayingClientConfig): PayingClient {
  const autoApprove = config.autoApprovePermit2 ?? true;
  const chain = CHAINS[config.network];
  const network = NETWORK_IDS[config.network];
  const usdcAddress = USDC_ADDRESSES[network];

  const account = privateKeyToAccount(config.privateKey);

  const walletClient = createWalletClient({
    account,
    chain,
    transport: http(),
  }).extend(publicActions);

  // WalletClient doesn't expose address at top level — spread for ClientEvmSigner
  const signer = { ...walletClient, address: account.address };

  const client = new x402Client();
  registerExactEvmScheme(client, { signer });

  const payingFetch = wrapFetchWithPayment(globalThis.fetch, client);

  let _permit2Approved = false;

  const approvePermit2 = async (): Promise<`0x${string}` | null> => {
    // Check current allowance first
    const allowance = await walletClient.readContract({
      address: usdcAddress,
      abi: ERC20_ABI,
      functionName: "allowance",
      args: [account.address, PERMIT2_ADDRESS],
    });

    if ((allowance as bigint) > 0n) {
      _permit2Approved = true;
      return null; // already approved
    }

    const hash = await walletClient.writeContract({
      address: usdcAddress,
      abi: ERC20_ABI,
      functionName: "approve",
      args: [PERMIT2_ADDRESS, maxUint256],
    });

    await walletClient.waitForTransactionReceipt({ hash });
    _permit2Approved = true;
    return hash;
  };

  const fetch: typeof globalThis.fetch = async (input, init) => {
    if (autoApprove && !_permit2Approved) {
      await approvePermit2();
    }
    return payingFetch(input, init);
  };

  return {
    fetch,
    address: account.address,
    approvePermit2,
  };
}
