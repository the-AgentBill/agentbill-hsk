/**
 * Express middleware factory for AgentBill HSK.
 * Same API as agentbill-base — drop-in for HashKey Chain.
 */
import type { Request, Response, NextFunction } from "express";
import { paymentMiddleware } from "@x402/express";
import { getState } from "./state.js";
import { NETWORK_IDS, USDC_ADDRESSES } from "./networks.js";

export interface RequirePaymentOptions {
  /** Amount in USDC, e.g. "0.01" */
  amount: string;
  currency?: "USDC";
  description?: string;
}

function toX402Pattern(expressPath: string): string {
  return expressPath.replace(/:([^/]+)/g, "[$1]");
}

/**
 * Express middleware that gates a route behind an x402 USDC payment.
 *
 * Uses Permit2 on HashKey Chain — no EIP-3009 required.
 *
 * @example
 * app.get("/api/data", requirePayment({ amount: "0.01" }), handler)
 */
export function requirePayment(options: RequirePaymentOptions) {
  let _cached:
    | ((req: Request, res: Response, next: NextFunction) => Promise<void>)
    | null = null;

  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const { config, server } = getState();

    if (!_cached) {
      const network = NETWORK_IDS[config.network];
      const expressPath: string = req.route?.path ?? "/*";
      const routeKey = toX402Pattern(expressPath);

      // Pass AssetAmount directly to bypass the default money parser
      // (which only knows Base USDC addresses)
      const usdcAddress = USDC_ADDRESSES[network];
      const rawAmount = String(Math.round(parseFloat(options.amount) * 1e6));

      const routes = {
        [routeKey]: {
          description:
            options.description ??
            `Payment required: ${options.amount} USDC`,
          accepts: [
            {
              scheme: "exact",
              payTo: config.receivingAddress,
              price: { amount: rawAmount, asset: usdcAddress },
              network,
              extra: { assetTransferMethod: "permit2" },
            },
          ],
        },
      };

      _cached = paymentMiddleware(routes, server);
    }

    return _cached(req, res, next);
  };
}
