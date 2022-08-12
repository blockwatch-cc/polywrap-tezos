# Cache
It is a caching library for the wrappers. Wrappers can store and retrieve data on cache using this library.

This library has been implemented in easily extensible way. It provides a common caching interface that can be shared across various caching implementations. We have already implemented the in-memory cache implementation and will be adding more such implementations like local-storage, memcache, redis, ceramic, etc.

## Usage

- **If you are a Wrap Developer** - then you just need to import the cache interface and can get all the implementations that client has registered in the wrapper using `Interface.getImplementations` function and use one or all of them to store and retrive the data from the cache. Alternatively you can also specify the uri of the particular implementation that you want to support.

  - Schema
    ```graphql
    #import * into Interface from "wrap://ens.interface.cache.polywrap.eth"
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
      Args_Foo 
    } from "./wrap";

    export function foo(args: Args_Foo) {
      const impls = Interface.getImplementations();
      if (impls.length < 1) {
        throw new Error("...")
      }
      const cache = new Interface_Module(impls[0]);

      cache.set(Args_Foo.key, Args_Foo.value);
    }
    ```
  


- **If you are an App Developer** - then you need to register the implementations of the cache interface using client config.

```ts
const config = {
  ...,
  plugins: [
    ...
    {
      uri: "wrap://ens/in-memory.cache.polywrap.eth"
      plugin: InMemoryCache()
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