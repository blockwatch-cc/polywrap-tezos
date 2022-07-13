# Logger wrapper

Uses the `Logger` interface and implementations to show logs in console. 

By configuring the client with implementations for uri `wrap://ens/logger.core.polywrap.eth`, we are able to
fetch those and trigger them

In this example, the client is being instantiated:

```typescript
/**
 * This is the default configuration of client.
 * Check https://github.com/polywrap/monorepo/blob/prealpha/packages/js/client/src/default-client-config.ts#L26-L121
 * for more information
 */
const client = new PolywrapClient({
  ...,
  plugins: {
    ...,
    {
      uri: "wrap://ens/js-logger.polywrap.eth",
      plugin: loggerPlugin({})  
    }
  }, 
  interfaces: {
    ...,
    interface: "wrap://ens/logger.core.polywrap.eth",
    implementations: [
      new Uri("wrap://ens/js-logger.polywrap.eth"),
    ]
  },
  ...
})
```
The implementation is being injected because we are defining the plugin with an URI and then adding it into
the implementations array on interface `wrap://ens/logger.core.polywrap.eth`.

Then, in the `schema.graphql` we declare the interface and use the `getImplementations` method.
```graphql
#import { Module } into Interface from "wrap://ens/logger.core.polywrap.eth"
#use { getImplementations } for Interface

type Module implements Interface_Module {}
```
The `wrap://ens/logger.core.polywrap.eth` URI points to ENS (in Mainnet) and contents
as a content the IPFS Hash where the deployed interface lives (check https://app.ens.domains/name/logger.core.polywrap.eth/details)

This will allow us to fetch the existing implementations in run time and execute them. In this
example, we are executing them all by doing:
```typescript
import { Interface, Input_log, Interface_Module } from "./wrap"

export function log(input: Input_log): bool {
  const uris = Interface.getImplementations()
  for (let i = 0; i < uris.length; i++) {
    new Interface_Module(uris[i]).log({
      message: input.message,
      level: input.level
    }).unwrap()
  }
  return true
}
```

### Log Methods

- debug
- info
- warn
- error

### How To Run

### 1. Set correct node version, install dependencies & build the wrapper

```
nvm use && yarn && yarn build
```

This method will create the `build` folder which will be then accessed just by doing `wrap://fs/./build`

### 2. Test The wrapper Using A Query Recipe

```
npx polywrap query ./recipes/e2e.json
```
