import { InjectedConnector } from "@wagmi/core";
import { WindowProvider } from 'wagmi';
import type { Chain } from "@wagmi/core/chains";
type InjectedConnectorOptions = {
    /** Name of connector */
    name?: string | ((detectedName: string | string[]) => string);
    /**
     * [EIP-1193](https://eips.ethereum.org/EIPS/eip-1193) Ethereum Provider to target
     *
     * @default
     * () => typeof window !== 'undefined' ? window.ethereum : undefined
     */
    getProvider?: () => WindowProvider | undefined;
    /**
     * MetaMask and other injected providers do not support programmatic disconnect.
     * This flag simulates the disconnect behavior by keeping track of connection status in storage. See [GitHub issue](https://github.com/MetaMask/metamask-extension/issues/10353) for more info.
     * @default true
     */
    shimDisconnect?: boolean;
};
declare global {
    interface Window {
        gatewallet: any;
    }
}
export declare class GatewalletConnector extends InjectedConnector {
    id: string;
    constructor({ chains, options: options_ }?: {
        chains?: Chain[];
        options?: InjectedConnectorOptions;
    });
    connect({ chainId }?: {
        chainId?: number;
    }): Promise<{
        account: `0x${string}`;
        chain: {
            id: number;
            unsupported: boolean;
        };
        provider: WindowProvider;
    }>;
}
export {};
