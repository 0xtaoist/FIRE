/**
 * Uniswap v4 on Robinhood Chain — direct swap wiring for the FIRE/ETH pool.
 * The Uniswap frontend is unreliable at routing brand-new hooked pools, so
 * the site swaps through the Universal Router itself with the exact PoolKey.
 *
 * Addresses from Uniswap's official Robinhood Chain deployment (verified
 * on-chain 2026-07-17). Pool params from the deploy script: fee 3000,
 * tickSpacing 60, native-ETH pair (currency0 = address(0)).
 */

import { encodeAbiParameters, encodePacked, zeroAddress } from "viem";
import { FIRE_CONTRACT, HOOK_CONTRACT } from "./contract";

export const UNIVERSAL_ROUTER = "0x8876789976decbfcbbbe364623c63652db8c0904" as `0x${string}`;
export const V4_QUOTER = "0x8dc178efb8111bb0973dd9d722ebeff267c98f94" as `0x${string}`;
export const PERMIT2 = "0x000000000022D473030F116dDEE9F6B43aC78BA3" as `0x${string}`;

export const POOL_FEE = 3000;
export const TICK_SPACING = 60;

/* Native ETH sorts first as address(0) — ETH is currency0, FIRE is currency1.
   Buy FIRE  = zeroForOne true  (ETH in,  FIRE out)
   Sell FIRE = zeroForOne false (FIRE in, ETH out) */
export const POOL_KEY = {
  currency0: zeroAddress,
  currency1: FIRE_CONTRACT,
  fee: POOL_FEE,
  tickSpacing: TICK_SPACING,
  hooks: HOOK_CONTRACT,
} as const;

const POOL_KEY_COMPONENTS = [
  { name: "currency0", type: "address" },
  { name: "currency1", type: "address" },
  { name: "fee", type: "uint24" },
  { name: "tickSpacing", type: "int24" },
  { name: "hooks", type: "address" },
] as const;

/* v4-periphery Actions */
const SWAP_EXACT_IN_SINGLE = 0x06;
const SETTLE_ALL = 0x0c;
const TAKE_ALL = 0x0f;
/* Universal Router command */
const V4_SWAP = 0x10;

/** Encode a Universal Router execute() for an exact-in single-pool v4 swap. */
export function encodeV4ExactInSingle({
  zeroForOne,
  amountIn,
  minAmountOut,
}: {
  zeroForOne: boolean;
  amountIn: bigint;
  minAmountOut: bigint;
}): { commands: `0x${string}`; inputs: `0x${string}`[] } {
  const actions = encodePacked(
    ["uint8", "uint8", "uint8"],
    [SWAP_EXACT_IN_SINGLE, SETTLE_ALL, TAKE_ALL]
  );

  const swapParams = encodeAbiParameters(
    [
      {
        name: "params",
        type: "tuple",
        components: [
          { name: "poolKey", type: "tuple", components: POOL_KEY_COMPONENTS },
          { name: "zeroForOne", type: "bool" },
          { name: "amountIn", type: "uint128" },
          { name: "amountOutMinimum", type: "uint128" },
          { name: "hookData", type: "bytes" },
        ],
      },
    ],
    [
      {
        poolKey: POOL_KEY,
        zeroForOne,
        amountIn,
        amountOutMinimum: minAmountOut,
        hookData: "0x",
      },
    ]
  );

  const currencyIn = zeroForOne ? POOL_KEY.currency0 : POOL_KEY.currency1;
  const currencyOut = zeroForOne ? POOL_KEY.currency1 : POOL_KEY.currency0;

  const settleParams = encodeAbiParameters(
    [{ type: "address" }, { type: "uint256" }],
    [currencyIn, amountIn]
  );
  const takeParams = encodeAbiParameters(
    [{ type: "address" }, { type: "uint256" }],
    [currencyOut, minAmountOut]
  );

  const input = encodeAbiParameters(
    [{ type: "bytes" }, { type: "bytes[]" }],
    [actions, [swapParams, settleParams, takeParams]]
  );

  return { commands: encodePacked(["uint8"], [V4_SWAP]), inputs: [input] };
}

export const UNIVERSAL_ROUTER_ABI = [
  {
    name: "execute",
    type: "function",
    stateMutability: "payable",
    inputs: [
      { name: "commands", type: "bytes" },
      { name: "inputs", type: "bytes[]" },
      { name: "deadline", type: "uint256" },
    ],
    outputs: [],
  },
] as const;

/* V4Quoter — declared view so wagmi/viem drive it through eth_call. */
export const V4_QUOTER_ABI = [
  {
    name: "quoteExactInputSingle",
    type: "function",
    stateMutability: "view",
    inputs: [
      {
        name: "params",
        type: "tuple",
        components: [
          { name: "poolKey", type: "tuple", components: POOL_KEY_COMPONENTS },
          { name: "zeroForOne", type: "bool" },
          { name: "exactAmount", type: "uint128" },
          { name: "hookData", type: "bytes" },
        ],
      },
    ],
    outputs: [
      { name: "amountOut", type: "uint256" },
      { name: "gasEstimate", type: "uint256" },
    ],
  },
] as const;

export const PERMIT2_ABI = [
  {
    name: "allowance",
    type: "function",
    stateMutability: "view",
    inputs: [
      { name: "owner", type: "address" },
      { name: "token", type: "address" },
      { name: "spender", type: "address" },
    ],
    outputs: [
      { name: "amount", type: "uint160" },
      { name: "expiration", type: "uint48" },
      { name: "nonce", type: "uint48" },
    ],
  },
  {
    name: "approve",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [
      { name: "token", type: "address" },
      { name: "spender", type: "address" },
      { name: "amount", type: "uint160" },
      { name: "expiration", type: "uint48" },
    ],
    outputs: [],
  },
] as const;

export const ERC20_ABI = [
  {
    name: "balanceOf",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "", type: "address" }],
    outputs: [{ name: "", type: "uint256" }],
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
] as const;
