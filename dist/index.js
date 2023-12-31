import { ConnectorNotFoundError, InjectedConnector } from "@wagmi/core";
import { ResourceNotFoundRpcError, UserRejectedRequestError, getAddress, } from "viem";
export class GatewalletConnector extends InjectedConnector {
    constructor({ chains, options: options_ } = {}) {
        const id = "gatewallet";
        const options = {
            name: "Gatewallet",
            shimDisconnect: true,
            getProvider() {
                function getReady(ethereum) {
                    const isGatewallet = !!ethereum?.isWeb3Wallet;
                    if (!isGatewallet)
                        return;
                    return ethereum;
                }
                if (typeof window === "undefined")
                    return;
                const ethereum = window?.gatewallet;
                if (ethereum?.providers)
                    return ethereum.providers.find(getReady);
                return getReady(ethereum);
            },
            ...options_,
        };
        super({ chains, options });
        this.id = id;
        this.shimDisconnectKey = `${this.id}.shimDisconnect`;
    }
    async connect({ chainId } = {}) {
        try {
            const provider = await this.getProvider();
            if (!provider)
                throw new ConnectorNotFoundError();
            if (provider.on) {
                provider.on("accountsChanged", this.onAccountsChanged);
                provider.on("chainChanged", this.onChainChanged);
                provider.on("disconnect", this.onDisconnect);
            }
            this.emit("message", { type: "connecting" });
            // Attempt to show wallet select prompt with `wallet_requestPermissions` when
            // `shimDisconnect` is active and account is in disconnected state (flag in storage)
            let account = null;
            if (this.options?.shimDisconnect &&
                !this.storage?.getItem(this.shimDisconnectKey)) {
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
                    }
                    catch (error) {
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
        }
        catch (error) {
            if (this.isUserRejectedRequestError(error))
                throw new UserRejectedRequestError(error);
            if (error.code === -32002)
                throw new ResourceNotFoundRpcError(error);
            throw error;
        }
    }
}
