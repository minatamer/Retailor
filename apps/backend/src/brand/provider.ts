import type { LogoContext } from "@retailor/contracts/brand";
export interface LogoAccounting {
  dispatch(): void;
  recordUsage(value: { input: number; output: number }): void;
}
/** One approved batch, no persistent library, external URLs or hidden retry. */
export interface LogoProvider {
  generate(
    context: LogoContext,
    signal: AbortSignal,
    accounting: LogoAccounting,
  ): Promise<readonly Uint8Array[]>;
}
