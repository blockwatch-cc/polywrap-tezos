# Logger
It is a helper library that allows logging to different streams using different loggers simultaneously. 
This removes the burden of choosing the appropriate logging service from the wrapper developer, and shifts it to the app developer that wants to integrate the wrapper.

## Usage

- **If you are a Wrapper Developer** - You just need to import the Logger interface, and you can get all the implementations that the client has registered in the wrapper using the `Interface.getImplementations` function.
    You can use one or all of them to print to the console. 
    Alternatively, you can specify the uri of the particular implementation that you want to support.

  - Schema
    ```graphql
    #import * into Logger from "wrap://ens/logger.polywrap.eth"

    type Module{
      foo(message: String!): Boolean!
    }
    ```
  
  - Wasm-as
    ```ts
    import { 
      Logger_Module,
      Args_foo
    } from "./wrap";

    export function foo(args: Args_foo) {
      Logger.info(args.message);
    }
    ```
  


- **If you are an App Developer** - You need to register the implementations of the Logger interface using the client config.

```ts
const config = {
  ...,
  plugins: [
    ...
    {
      uri: "wrap://ens/core.logger.polywrap.eth"
      plugin: LoggerPlugin()
    }
  ]
  interfaces: [
    {
      interface: "wrap://ens/core.logger.polywrap.eth",
      implementations: [
        "wrap://ens/js-logger.polywrap.eth",
        ...
      ]
    }
  ]
}
```