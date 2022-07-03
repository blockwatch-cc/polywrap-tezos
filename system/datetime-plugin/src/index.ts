import { PluginFactory } from "@polywrap/core-js";
import { manifest, Module } from "./wrap";

export interface DateTimePluginConfig extends Record<string, unknown> {}

export class DateTimePlugin extends Module<DateTimePluginConfig> {
  public currentTimestamp(): string {
    return Date.now().toString();
  }
}

export const dateTimePlugin: PluginFactory<DateTimePluginConfig> = (
  config: DateTimePluginConfig
) => {
  return {
    factory: () => new DateTimePlugin(config),
    manifest: manifest,
  };
};

export const plugin = dateTimePlugin;
