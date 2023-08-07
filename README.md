# GateWallet Wagmi Connector
This small package allows you to add a dedicated, functional, connector to integrate GateWallet into your wagmi ^v1 project

to install
```javascript
// package.json
{
  "dependencies": {
    "wagmi": "^1.0.6",
    "gatewallet-wagmi-connector": "https://github.com/gatechain/gatewallet-wagmi-connector"
  },
}
```
```sh
yarn install
# or
npm install
```

## Import
```javascript
import { GatewalletConnector } from "gatewallet-wagmi-connector"
```

## Usage
```javascript
import { GatewalletConnector } from "gatewallet-wagmi-connector"

const connector = new GatewalletConnector()
```

## Configuration

```javascript
import { configureChains, createConfig } from "wagmi";
import { goerli, mainnet } from "wagmi/chains";
import { publicProvider } from "wagmi/providers/public";

import { InjectedConnector } from "wagmi/connectors/injected";

const { chains, publicClient, webSocketPublicClient } = configureChains(
  [mainnet, ...(process.env.NODE_ENV === "development" ? [goerli] : [])],
  [publicProvider()]
);

export const config = createConfig({
  autoConnect: true,
  connectors: [
    new GatewalletConnector({ chains } as any),
    new InjectedConnector({
      chains,
      options: {
        name: "Injected",
        shimDisconnect: true,
      },
    }),
  ],
  publicClient,
  webSocketPublicClient,
})
```
