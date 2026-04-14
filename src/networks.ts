import { defineChain } from "viem";

// HashKey Chain Mainnet — chain ID 177 (0xb1)
export const hashkeyMainnet = defineChain({
  id: 177,
  name: "HashKey Chain",
  nativeCurrency: { name: "HSK", symbol: "HSK", decimals: 18 },
  rpcUrls: {
    default: { http: ["https://mainnet.hsk.xyz"] },
  },
  blockExplorers: {
    default: { name: "Blockscout", url: "https://hashkey.blockscout.com" },
  },
});

// HashKey Chain Testnet — chain ID 133
export const hashkeyTestnet = defineChain({
  id: 133,
  name: "HashKey Chain Testnet",
  nativeCurrency: { name: "HSK", symbol: "HSK", decimals: 18 },
  rpcUrls: {
    default: { http: ["https://testnet.hsk.xyz"] },
  },
  blockExplorers: {
    default: {
      name: "Blockscout",
      url: "https://hashkey-testnet.blockscout.com",
    },
  },
  testnet: true,
});

// CAIP-2 network IDs for x402
export const NETWORK_IDS = {
  "hashkey-mainnet": "eip155:177",
  "hashkey-testnet": "eip155:133",
} as const;

export type NetworkName = keyof typeof NETWORK_IDS;

// USDC contract addresses on HashKey Chain
export const USDC_ADDRESSES: Record<string, `0x${string}`> = {
  "eip155:177": "0x054ed45810DbBAb8B27668922D110669c9D88D0a",
  "eip155:133": "0x18Ec8e93627c893ae61ae0491c1C98769FD4Dfa2",
};

export const CHAINS = {
  "hashkey-mainnet": hashkeyMainnet,
  "hashkey-testnet": hashkeyTestnet,
} as const;
