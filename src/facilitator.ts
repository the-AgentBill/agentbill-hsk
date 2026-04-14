/**
 * In-process x402 facilitator for HashKey Chain.
 *
 * Replaces Coinbase's external CDP facilitator with one that runs inside the
 * same process, pointed at HashKey Chain testnet or mainnet via viem.
 *
 * The facilitator wallet submits the Permit2.permitTransferFrom() call on-chain,
 * so it must be funded with HSK (gas). Set FACILITATOR_PRIVATE_KEY in env.
 */
import { x402Facilitator } from "@x402/core/facilitator";
import { registerExactEvmScheme } from "@x402/evm/exact/facilitator";
import type { FacilitatorEvmSigner } from "@x402/evm";
import { createWalletClient, http, publicActions } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import type { FacilitatorClient } from "@x402/core/server";
import { CHAINS, type NetworkName } from "./networks.js";

/**
 * Wraps x402Facilitator (in-process) to satisfy the FacilitatorClient interface
 * expected by x402ResourceServer.
 */
class LocalFacilitatorClient implements FacilitatorClient {
  constructor(private readonly inner: x402Facilitator) {}

  verify: FacilitatorClient["verify"] = (payload, requirements) =>
    this.inner.verify(payload, requirements);

  settle: FacilitatorClient["settle"] = (payload, requirements) =>
    this.inner.settle(payload, requirements);

  getSupported: FacilitatorClient["getSupported"] = async () =>
    this.inner.getSupported() as Awaited<
      ReturnType<FacilitatorClient["getSupported"]>
    >;
}

/**
 * Creates an in-process facilitator client for the given HashKey networks.
 *
 * @param networks - HashKey network names to support (e.g. ["hashkey-testnet"])
 * @param facilitatorPrivateKey - Private key for the facilitator wallet (needs HSK for gas)
 */
export function createHashKeyFacilitator(
  networks: NetworkName[],
  facilitatorPrivateKey: `0x${string}`
): FacilitatorClient {
  const facilitator = new x402Facilitator();

  for (const network of networks) {
    const chain = CHAINS[network];
    const account = privateKeyToAccount(facilitatorPrivateKey);

    const walletClient = createWalletClient({
      account,
      chain,
      transport: http(),
    }).extend(publicActions);

    // Build FacilitatorEvmSigner manually — viem's generic writeContract
    // signature doesn't satisfy the interface directly without type assertions
    const signer: FacilitatorEvmSigner = {
      getAddresses: () => [account.address],
      readContract: (args) => walletClient.readContract(args as never),
      verifyTypedData: (args) => walletClient.verifyTypedData(args as never),
      writeContract: (args) =>
        walletClient.writeContract({ ...args, account } as never),
      sendTransaction: (args) =>
        walletClient.sendTransaction({ ...args, account } as never),
      waitForTransactionReceipt: (args) =>
        walletClient
          .waitForTransactionReceipt(args)
          .then((r) => ({ status: r.status as string })),
      getCode: (args) =>
        walletClient
          .getCode(args)
          .then((c) => c ?? ("0x" as `0x${string}`)),
    };

    registerExactEvmScheme(facilitator, {
      signer,
      networks: [`eip155:${chain.id}`],
    });
  }

  return new LocalFacilitatorClient(facilitator);
}
