const TezosRpcNodes: { [key: string]: string } = {
  mainnet: "https://rpc.tzstats.com",
  ghostnet: "https://rpc.ghost.tzstats.com"
};

export const getProvider: (name: string) => string = (name) =>
  TezosRpcNodes[name];
