export const SupportedActions = ["Commit", "Buy", "NameRegistry"];
export const DefaultAddresses = new Map<string, string>();

// Mainnet
DefaultAddresses.set("Mainnet.Commit", "KT1P8n2qzJjwMPbHJfi4o8xu6Pe3gaU3u2A3");
DefaultAddresses.set("Mainnet.Buy", "KT191reDVKrLxU9rjTSxg53wRqj6zh8pnHgr");
DefaultAddresses.set("Mainnet.NameRegistry", "KT1GBZmSxmnKJXGMdMLbugPfLyUPmuLSMwKS");

// Ghostnet
DefaultAddresses.set("Ghostnet.Commit", "KT1WffvKqRGaPtVWYR1ZkG2GQY42B7a8x3kk");
DefaultAddresses.set("Ghostnet.Buy", "KT1Fea9sCJ4BKjEYHLoEja7JuhXxKZkv9XDp");
DefaultAddresses.set("Ghostnet.NameRegistry", "KT1GFYUFQRT4RsNbtG2NU23woUyMp5tx9gx2");
