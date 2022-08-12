# Cache
It is a caching library for the wrappers. Wrappers can store and retrieve data in cache using this library.

This library has been implemented in an easily extensible way. It provides a common caching interface that can be shared across various caching implementations. We have already implemented the in-memory cache implementation and will be adding more such implementations, like local-storage, memcache, redis, ceramic, etc.

## Usage

- **If you are a Wrapper Developer** - 
 You just need to import the Cache interface, and you can get all the implementations that the Polywrap client has registered from within the wrapper using the `Interface.getImplementations` function.  
 You can use one or all of the implementations to store and retrieve data from the cache. 
 Alternatively, you can specify the uri of the particular implementation that you want to support.

  - Schema
    ```graphql
    #import * into Interface from "wrap://ens/interface.cache.polywrap.eth"
    #use { getImplementations } for Interface

    type Module{
      foo(key: String!, value: String!): Boolean!
    }
    ```
  
  - Wasm-as
    ```ts
    import { 
      Interface,
      Interface_Module,
      Args_foo 
    } from "./wrap";

    export function foo(args: Args_foo) {
      const impls = Interface.getImplementations();
      if (impls.length < 1) {
        throw new Error("...")
      }
      const cache = new Interface_Module(impls[0]);

      cache.set(Args_Foo.key, Args_Foo.value);
    }
    ```
  


- **If you are an App Developer** - You need to register the implementations of the Cache interface using the client config.

```ts
const config = {
  ...,
  plugins: [
    ...
    {
      uri: "wrap://ens/in-memory.cache.polywrap.eth"
      plugin: InMemoryCachePlugin()
    }
  ]
  interfaces: [
    {
      interface: "wrap://ens/interface.cache.polywrap.eth",
      implementations: [
        "wrap://ens/in-memory.cache.polywrap.eth",
        ...
      ]
    }
  ]
}
```