/**
 * AgentBill HSK — Express demo server
 *
 * Runs on HashKey Chain testnet. Exposes one free route and one paid route
 * that requires $0.01 USDC via x402 + Permit2.
 *
 * Usage:
 *   cp .env.example .env   # fill in RECEIVING_ADDRESS + FACILITATOR_PRIVATE_KEY
 *   npm run example:server
 */
import "dotenv/config";
import express from "express";
import { agentBill, requirePayment } from "../src/index.js";

const app = express();

app.use((req, res, next) => {
  res.on("finish", () => console.log(`${res.statusCode} ${req.method} ${req.path}`));
  next();
});

agentBill.init({
  receivingAddress: process.env.RECEIVING_ADDRESS as `0x${string}`,
  network: "hashkey-testnet",
});

// Free route
app.get("/", (_req, res) => {
  res.json({
    message: "AgentBill HSK demo server",
    network: "HashKey Chain Testnet",
    paidRoutes: ["/api/weather"],
  });
});

// Paid route — requires $0.01 USDC via x402 + Permit2
app.get(
  "/api/weather",
  requirePayment({
    amount: "0.01",
    currency: "USDC",
    description: "Real-time weather data",
  }),
  (_req, res) => {
    res.json({
      city: "Hong Kong",
      temp: "28°C",
      humidity: "78%",
      condition: "Partly cloudy",
    });
  }
);

const PORT = process.env.PORT ?? 3000;
app.listen(PORT, () => {
  console.log(`AgentBill HSK server running on http://localhost:${PORT}`);
  console.log(`  GET /            → free`);
  console.log(`  GET /api/weather → $0.01 USDC (x402 + Permit2)`);
});
