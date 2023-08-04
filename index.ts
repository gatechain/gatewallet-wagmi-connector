import { ConnectorNotFoundError, InjectedConnector } from "@wagmi/core";
import {
  ResourceNotFoundRpcError,
  UserRejectedRequestError,
  getAddress,
} from "viem";
import { WindowProvider } from 'wagmi'
import type { Chain } from "@wagmi/chains"

type InjectedConnectorOptions = {
  /** Name of connector */
  name?: string | ((detectedName: string | string[]) => string)
  /**
   * [EIP-1193](https://eips.ethereum.org/EIPS/eip-1193) Ethereum Provider to target
   *
   * @default
   * () => typeof window !== 'undefined' ? window.ethereum : undefined
   */
  getProvider?: () => WindowProvider | undefined
  /**
   * MetaMask and other injected providers do not support programmatic disconnect.
   * This flag simulates the disconnect behavior by keeping track of connection status in storage. See [GitHub issue](https://github.com/MetaMask/metamask-extension/issues/10353) for more info.
   * @default true
   */
  shimDisconnect?: boolean
}

declare global {
  interface Window {
    gatewallet: any
  }
}


export class GatewalletConnector extends InjectedConnector {
  public id: string
  constructor({ chains, options: options_ }: { chains?: Chain[], options?: InjectedConnectorOptions } = {}) {
    const id = "gatewallet";
    const options = {
      name: "Gatewallet",
      shimDisconnect: true,
      getProvider() {
        function getReady(ethereum?: WindowProvider & { isWeb3Wallet: boolean }) {
          const isGatewallet = !!ethereum?.isWeb3Wallet;
          if (!isGatewallet) return;
          return ethereum;
        }
        if (typeof window === "undefined") return;
        const ethereum = window?.gatewallet;
        if (ethereum?.providers) return ethereum.providers.find(getReady);
        return getReady(ethereum);
      },
      ...options_,
    };
    super({ chains, options });
    this.id = id;
    this.shimDisconnectKey = `${this.id}.shimDisconnect`;
  }
  async connect({ chainId }: { chainId?: number } = {}) {
    try {
      const provider = await this.getProvider();
      if (!provider) throw new ConnectorNotFoundError();
      if (provider.on) {
        provider.on("accountsChanged", this.onAccountsChanged);
        provider.on("chainChanged", this.onChainChanged);
        provider.on("disconnect", this.onDisconnect);
      }
      this.emit("message", { type: "connecting" });
      // Attempt to show wallet select prompt with `wallet_requestPermissions` when
      // `shimDisconnect` is active and account is in disconnected state (flag in storage)
      let account = null;
      if (
        this.options?.shimDisconnect &&
        !this.storage?.getItem(this.shimDisconnectKey)
      ) {
        account = await this.getAccount().catch(() => null);
        const isConnected = !!account;
        if (isConnected)
          // Attempt to show another prompt for selecting wallet if already connected
          try {
            await provider.request({
              method: "wallet_requestPermissions",
              params: [{ eth_accounts: {} }],
            });
            // User may have selected a different account so we will need to revalidate here.
            account = await this.getAccount();
          } catch (error: any) {
            if (this.isUserRejectedRequestError(error))
              throw new UserRejectedRequestError(error);
            if (error.code === new ResourceNotFoundRpcError(error).code)
              throw error;
          }
      }
      if (!account) {
        const accounts = await provider.request({
          method: "eth_requestAccounts",
        });
        account = getAddress(accounts[0]);
      }
      // Switch to chain if provided
      let id = await this.getChainId();
      let unsupported = this.isChainUnsupported(id);
      if (chainId && id !== chainId) {
        const chain = await this.switchChain(chainId);
        id = chain.id;
        unsupported = this.isChainUnsupported(id);
      }
      if (this.options?.shimDisconnect)
        this.storage?.setItem(this.shimDisconnectKey, true);
      return { account, chain: { id, unsupported }, provider };
    } catch (error: any) {
      if (this.isUserRejectedRequestError(error))
        throw new UserRejectedRequestError(error);
      if (error.code === -32002) throw new ResourceNotFoundRpcError(error);
      throw error;
    }
  }
}
