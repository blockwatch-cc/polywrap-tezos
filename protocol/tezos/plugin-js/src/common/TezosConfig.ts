import { ConnectionConfigs } from "./Connection";

export interface TezosConfig {
  networks: ConnectionConfigs;
  defaultNetwork?: string;
}
