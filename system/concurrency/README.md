# Concurrency
It allows wrappers to subinvoke multiple wrappers concurrently. 


This library has been implemented in an easily extensible way. It provides a common concurrency interface that can be shared across various concurrency implementations, like Threads, Processes and even language specific primitives like JavaScript Promises. We have already implemented the promise plugin implementation and will be adding more such implementations for primitives like threads and processes.

## Usage

- **If you are a Wrapper Developer** - You just need to import the Concurrent interface, and you can get all the implementations that the client has registered in the wrapper using `Interface.getImplementations` function.
    You can use one or all of them to schedule the sub-invocations concurrently and get the result asynchoronously.
    Alternatively, you can specify the uri of the particular implementation that you want to support.

  - Schema
    ```graphql
    #import * into Interface from "wrap://ens/interface.concurrent.polywrap.eth"
    #use { getImplementations } for Interface

    type Module{
      foo(tasks: [Interface_Task!]!): Boolean!
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
      const concurrent = new Interface_Module(impls[0]);

      const taskIds = concurrent.schedule(args.tasks);

      ...

      const results = concurrent.result(taskIds);
    }
    ```
  


- **If you are an App Developer** - You need to register the implementations of the Concurrent interface using the client config.

```ts
const config = {
  ...,
  plugins: [
    ...
    {
      uri: "wrap://ens/promise.concurrent.polywrap.eth"
      plugin: ConcurrentPromisePlugin()
    }
  ]
  interfaces: [
    {
      interface: "wrap://ens/interface.cache.polywrap.eth",
      implementations: [
        "wrap://ens/promise.concurrent.polywrap.eth",
        ...
      ]
    }
  ]
}
```