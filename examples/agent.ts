/**
 * AgentBill HSK — AI agent demo client
 *
 * Simulates an AI agent that autonomously pays for API access on HashKey Chain.
 * No human in the loop — the agent detects the 402, signs a Permit2 authorization,
 * and retries. From the agent's perspective it's just a fetch() call.
 *   npm run example:agent
 */
import "dotenv/config";
import { createPayingClient } from "../src/index.js";

const SERVER_URL = process.env.SERVER_URL ?? "http://localhost:3000";

async function main() {
  const privateKey = process.env.AGENT_PRIVATE_KEY as `0x${string}`;
  if (!privateKey) throw new Error("AGENT_PRIVATE_KEY is required in .env");

  const client = createPayingClient({
    privateKey,
    network: "hashkey-testnet",
    // autoApprovePermit2: true (default) — approves on first use
  });

  console.log(`Agent wallet: ${client.address}`);
  console.log(`Target:       ${SERVER_URL}/api/weather`);
  console.log();

  // First call: may trigger one-time Permit2 approval (costs HSK gas)
  console.log("Calling paid endpoint...");
  const start = Date.now();

  const response = await client.fetch(`${SERVER_URL}/api/weather`);
  const elapsed = Date.now() - start;

  console.log(`Status: ${response.status} (${elapsed}ms)`);

  if (response.ok) {
    const data = await response.json();
    console.log("Response:", JSON.stringify(data, null, 2));
    console.log();
    console.log("Payment settled on HashKey Chain via Permit2.");
  } else if (response.status === 402) {
    const header = response.headers.get("PAYMENT-REQUIRED");
    if (header) {
      const decoded = JSON.parse(
        Buffer.from(header, "base64").toString("utf8")
      );
      console.error("Payment failed:", decoded.error ?? decoded);
    } else {
      console.error("402 Payment Required — check server logs.");
    }
    process.exit(1);
  } else {
    console.error("Unexpected status:", response.status, await response.text());
    process.exit(1);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
