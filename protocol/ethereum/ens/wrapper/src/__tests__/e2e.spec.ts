import {
  buildAndDeployWrapper,
  initTestEnvironment,
  stopTestEnvironment,
  providers as testEnvProviders,
  ensAddresses,
} from "@polywrap/test-env-js";
import { PolywrapClient } from "@polywrap/client-js";
import path from "path";
import { providers } from "ethers";

import { getPlugins } from "./utils";

jest.setTimeout(300000);

describe("ENS Wrapper", () => {
  // We will have two clients because we need two
  // different signers in order to test ENS functions
  let ownerClient: PolywrapClient;
  let anotherOwnerClient: PolywrapClient;

  let ensUri: string;
  let ethersProvider: providers.JsonRpcProvider;
  let registryAddress: string;
  let registrarAddress: string;
  let resolverAddress: string;
  let reverseRegistryAddress: string;
  let customFifsRegistrarAddress: string;

  let owner: string;
  let anotherOwner: string;

  const customTld: string = "doe.eth";
  const openSubdomain: string = "open." + customTld;
  const customSubdomain: string = "john." + customTld;

  const network: string = "testnet";

  beforeAll(async () => {
    await initTestEnvironment();

    // deploy api
    const apiPath: string = path.resolve(__dirname + "/../../");
    const api = await buildAndDeployWrapper({
      wrapperAbsPath: apiPath,
      ethereumProvider: testEnvProviders.ethereum,
      ipfsProvider: testEnvProviders.ipfs,
      ensName: "test-domain.eth"
    });
    ensUri = `ens/testnet/${api.ensDomain}`;

    // set up ethers provider
    ethersProvider = providers.getDefaultProvider(
      testEnvProviders.ethereum
    ) as providers.JsonRpcProvider;
    owner = await ethersProvider.getSigner(0).getAddress();
    anotherOwner = await ethersProvider.getSigner(1).getAddress();
    registryAddress = ensAddresses.ensAddress;
    registrarAddress = ensAddresses.registrarAddress;
    resolverAddress = ensAddresses.resolverAddress;
    reverseRegistryAddress = ensAddresses.reverseAddress;

    // get client
    const plugins = getPlugins(testEnvProviders.ethereum, testEnvProviders.ipfs, ensAddresses.ensAddress);
    ownerClient = new PolywrapClient({ plugins });

    const anotherOwnerRedirects = getPlugins(
      testEnvProviders.ethereum, 
      testEnvProviders.ipfs, 
      ensAddresses.ensAddress, 
      anotherOwner
    );
    anotherOwnerClient = new PolywrapClient({ plugins: anotherOwnerRedirects });
  });

  afterAll(async () => {
    await stopTestEnvironment();
  });

  it("should register domain", async () => {
    const {
      data: registerData,
      error: registerError,
    } = await ownerClient.invoke<string>({
      uri: ensUri,
      method: "registerDomain",
      args: {
        domain: customTld,
        owner,
        registryAddress,
        registrarAddress: registrarAddress,
        connection: {
          networkNameOrChainId: network
        }
      }
    });

    expect(registerData).toBeDefined();
    expect(registerError).toBeUndefined();
  });

  it("should set and get resolver", async () => {
    const {
      data: setResolverData,
      error: setResolverError,
    } = await ownerClient.invoke({
      uri: ensUri,
      method: "setResolver", 
      args: {
        domain: customTld,
        owner,
        registryAddress,
        resolverAddress: resolverAddress,
        connection: {
          networkNameOrChainId: network
        }
      }
    });

    expect(setResolverData).toBeDefined();
    expect(setResolverError).toBeUndefined();

    const {
      data: getResolverData,
      error: getResolverError,
    } = await ownerClient.invoke({
      uri: ensUri,
      method: "getResolver",
      args: {
        domain: customTld,
        registryAddress,
        connection: {
          networkNameOrChainId: network
        }
      }
    });

    expect(getResolverData).toEqual(resolverAddress);
    expect(getResolverError).toBeUndefined();
  });

  it("should set owner of subdomain and fetch it", async () => {
    const subdomain = "bob." + customTld;

    const {
      data: setSubdomainOwnerData,
      error: setSubdomainError,
    } = await ownerClient.invoke({
      uri: ensUri,
      method: "setSubdomainOwner",
      args: {
        subdomain,
        owner,
        registryAddress,
        connection: {
          networkNameOrChainId: network
        }
      }
    });

    expect(setSubdomainOwnerData).toBeDefined();
    expect(setSubdomainError).toBeUndefined();

    const {
      data: getOwnerData,
      error: getOwnerError,
    } = await ownerClient.invoke({
      uri: ensUri,
      method: "getOwner",
      args: {
        domain: subdomain,
        registryAddress,
        connection: {
          networkNameOrChainId: network
        }
      }
    });

    expect(getOwnerData).toBeDefined();
    expect(getOwnerError).toBeUndefined();
  });

  it("should register domain with subdomains recursively and fetch it", async () => {
    const domain = "foo.bar.baz.mydomain.eth";

    const {
      data: registerDomainAndSubdomainsRecursivelyData,
      error: registerDomainAndSubdomainsRecursivelyError,
    } = await ownerClient.invoke({
      uri: ensUri,
      method: "registerDomainAndSubdomainsRecursively",
      args: {
        domain,
        owner,
        registryAddress,
        resolverAddress,
        registrarAddress,
        ttl: '0',
        connection: {
          networkNameOrChainId: network
        }
      }
    });

    expect(registerDomainAndSubdomainsRecursivelyData).toBeDefined();
    expect(registerDomainAndSubdomainsRecursivelyError).toBeUndefined();
    
    const resultingRegistrations = registerDomainAndSubdomainsRecursivelyData as any[];

    expect(resultingRegistrations[0]?.name).toBe("mydomain.eth")
    expect(resultingRegistrations[0]?.didRegister).toBe(true)
    expect(resultingRegistrations[1]?.name).toBe("baz.mydomain.eth")
    expect(resultingRegistrations[1]?.didRegister).toBe(true)
    expect(resultingRegistrations[2]?.name).toBe("bar.baz.mydomain.eth")
    expect(resultingRegistrations[2]?.didRegister).toBe(true)
    expect(resultingRegistrations[3]?.name).toBe("foo.bar.baz.mydomain.eth")
    expect(resultingRegistrations[3]?.didRegister).toBe(true)

    const {
      data: getOwnerData,
      error: getOwnerError,
    } = await ownerClient.invoke({
      uri: ensUri,
      method: "getOwner",
      args: {
        domain,
        registryAddress,
        connection: {
          networkNameOrChainId: network
        }
      }
    });

    expect(getOwnerError).toBeUndefined();
    expect(getOwnerData).toBeDefined();
    expect(getOwnerData).toBe(owner);

    // No subdomain

    const domainWithNoSubdomain = "sumtin.eth";
  
    const {
      data: domainWithNoSubdomainData,
      error: domainWithNoSubdomainError,
    } = await ownerClient.invoke({
      uri: ensUri,
      method: "registerDomainAndSubdomainsRecursively",
      args: {
        domain: domainWithNoSubdomain,
        owner,
        registryAddress,
        resolverAddress,
        registrarAddress,
        ttl: '0',
        connection: {
          networkNameOrChainId: network
        }
      }
    });

    expect(domainWithNoSubdomainData).toBeDefined();
    expect(domainWithNoSubdomainError).toBeUndefined();
    
    const domainWithNoSubdomainRegistrations = domainWithNoSubdomainData as any[];

    expect(domainWithNoSubdomainRegistrations[0]?.name).toBe("sumtin.eth")
  });

  it("should not attempt to re-register registered subdomains/domains when recursively registering", async () => {
    const rootDomain = "domain.eth"
    const label = "sub"
    const tld = `${label}.${rootDomain}`
    const subdomain = `already.registered.${tld}`;

    await ownerClient.invoke<string>({
      uri: ensUri,
      method: "",
      args: {
        domain: tld,
        owner,
        registryAddress,
        registrarAddress,
        connection: {
          networkNameOrChainId: network
        }
      }
    });

    await ownerClient.invoke<string>({
      uri: ensUri,
      method: "registerDomain",
      args: {
        domain: rootDomain,
        owner,
        registryAddress,
        registrarAddress,
        connection: {
          networkNameOrChainId: network
        }
      }
    });

    await ownerClient.invoke({
      uri: ensUri,
      method: "setSubdomainRecord",
      args: {
        domain: rootDomain,
        label,
        owner,
        registryAddress,
        resolverAddress,
        ttl: '0',
        connection: {
          networkNameOrChainId: network
        }
      }
    });

    const {
      data: registerDomainAndSubdomainsRecursivelyData,
      error: registerDomainAndSubdomainsRecursivelyError,
    } = await ownerClient.invoke({
      uri: ensUri,
      method: "registerDomainAndSubdomainsRecursively",
      args: {
        domain: subdomain,
        owner,
        registryAddress,
        resolverAddress,
        registrarAddress,
        ttl: '0',
        connection: {
          networkNameOrChainId: network
        }
      }
    });

    expect(registerDomainAndSubdomainsRecursivelyData).toBeDefined();
    expect(registerDomainAndSubdomainsRecursivelyError).toBeUndefined();
    
    const resultingRegistrations = registerDomainAndSubdomainsRecursivelyData as any[];

    expect(resultingRegistrations[0]?.name).toBe("domain.eth")
    expect(resultingRegistrations[0]?.didRegister).toBe(false)
    expect(resultingRegistrations[1]?.name).toBe("sub.domain.eth")
    expect(resultingRegistrations[1]?.didRegister).toBe(false)
    expect(resultingRegistrations[2]?.name).toBe("registered.sub.domain.eth")
    expect(resultingRegistrations[2]?.didRegister).toBe(true)
    expect(resultingRegistrations[3]?.name).toBe("already.registered.sub.domain.eth")
    expect(resultingRegistrations[3]?.didRegister).toBe(true)

    const {
      data: getOwnerData,
      error: getOwnerError,
    } = await ownerClient.invoke({
      uri: ensUri,
      method: "getOwner",
      args: {
        domain: subdomain,
        registryAddress,
        connection: {
          networkNameOrChainId: network
        }
      },
    });

    expect(getOwnerData).toBeDefined();
    expect(getOwnerError).toBeUndefined();
    expect(getOwnerData).toBe(owner);
  });

  it("should register subdomain recursively and fetch it", async () => {
    const tld = "basedomain.eth";
    const subdomain = `aaa.bbb.ccc.${tld}`;

    await ownerClient.invoke<string>({
      uri: ensUri,
      method: "registerDomain",
      args: {
        domain: tld,
        owner,
        registrarAddress,
        registryAddress,
        connection: {
          networkNameOrChainId: network
        }
      }
    });

    const {
      data: registerSubdomainsRecursivelyData,
      error: registerSubdomainsRecursivelyError,
    } = await ownerClient.invoke({
      uri: ensUri,
      method: "registerSubdomainsRecursively",
      args: {
        domain: subdomain,
        owner,
        registryAddress,
        resolverAddress,
        registrarAddress,
        ttl: '0',
        connection: {
          networkNameOrChainId: network
        }
      }
    });

    expect(registerSubdomainsRecursivelyData).toBeDefined();
    expect(registerSubdomainsRecursivelyError).toBeUndefined();
    
    const resultingRegistrations = registerSubdomainsRecursivelyData as any[];

    expect(resultingRegistrations[0]?.name).toBe("ccc.basedomain.eth")
    expect(resultingRegistrations[0]?.didRegister).toBe(true)
    expect(resultingRegistrations[1]?.name).toBe("bbb.ccc.basedomain.eth")
    expect(resultingRegistrations[1]?.didRegister).toBe(true)
    expect(resultingRegistrations[2]?.name).toBe("aaa.bbb.ccc.basedomain.eth")
    expect(resultingRegistrations[2]?.didRegister).toBe(true)

    const {
      data: getOwnerData,
      error: getOwnerError,
    } = await ownerClient.invoke({
      uri: ensUri,
      method: "getOwner",
      args: {
        domain: subdomain,
        registryAddress,
        connection: {
          networkNameOrChainId: network
        }
      }
    });

    expect(getOwnerData).toBeDefined();
    expect(getOwnerError).toBeUndefined();
    expect(getOwnerData).toBe(owner);
  });

  it("should set subdomain owner, resolver and ttl", async () => {
    const {
      data: setSubdomainRecordData,
      error: setSubdomainRecordError,
    } = await ownerClient.invoke({
      uri: ensUri,
      method: "setSubdomainRecord",
      args: {
        domain: customTld,
        label: "john",
        owner: anotherOwner,
        registryAddress,
        resolverAddress,
        ttl: '0',
        connection: {
          networkNameOrChainId: network
        }
      }
    });

    expect(setSubdomainRecordData).toBeDefined();
    expect(setSubdomainRecordError).toBeUndefined();

    const {
      data: getOwnerData,
      error: getOwnerError,
    } = await ownerClient.invoke({
      uri: ensUri,
      method: "getOwner",
      args: {
        domain: customSubdomain,
        registryAddress,
        connection: {
          networkNameOrChainId: network
        }
      }
    });
    expect(getOwnerData).toEqual(anotherOwner);
    expect(getOwnerError).toBeUndefined();
  });

  it("should update and fetch owner", async () => {
    const {
      data: getOldOwnerData,
      error: getOldOwnerError,
    } = await anotherOwnerClient.invoke({
      uri: ensUri,
      method: "getOwner",
      args: {
        domain: customSubdomain,
        registryAddress,
        connection: {
          networkNameOrChainId: network
        }
      }
    });

    expect(getOldOwnerData).toEqual(anotherOwner);
    expect(getOldOwnerError).toBeUndefined();

    const {
      data: setOwnerData,
      error: setOwnerError,
    } = await anotherOwnerClient.invoke({
      uri: ensUri,
      method: "setOwner",
      args: {
        domain: customSubdomain,
        newOwner: owner,
        registryAddress,
        connection: {
          networkNameOrChainId: network
        }
      }
    });

    expect(setOwnerData).toBeDefined();
    expect(setOwnerError).toBeUndefined();

    const {
      data: getNewOwnerData,
      error: getNewOwnerError,
    } = await ownerClient.invoke({
      uri: ensUri,
      method: "getOwner",
      args: {
        domain: customSubdomain,
        registryAddress,
        connection: {
          networkNameOrChainId: network
        }
      }
    });

    expect(getNewOwnerData).toEqual(owner);
    expect(getNewOwnerError).toBeUndefined();
  });

  it("should set content hash and fetch it", async () => {
    const cid = "0x64EC88CA00B268E5BA1A35678A1B5316D212F4F366B2477232534A8AECA37F3C".toLowerCase();

    const {
      data: setContentHashData,
      error: setContentHashError,
    } = await ownerClient.invoke({
      uri: ensUri,
      method: "setContentHash",
      args: {
        domain: customSubdomain,
        cid,
        resolverAddress,
        connection: {
          networkNameOrChainId: network
        }
      }
    });

    expect(setContentHashData).toBeDefined();
    expect(setContentHashError).toBeUndefined();

    const {
      data: getContentHashData,
      error: getContentHashError,
    } = await ownerClient.invoke({
      uri: ensUri,
      method: "getContentHash",
      args: {
        domain: customSubdomain,
        resolverAddress,
        connection: {
          networkNameOrChainId: network
        }
      },
    });

    expect(getContentHashData).toEqual(cid);
    expect(getContentHashError).toBeUndefined();

    const {
      data: getContentHashFromDomainData,
      error: getContentHashFromDomainError,
    } = await ownerClient.invoke({
      uri: ensUri,
      method: "getContentHashFromDomain",
      args: {
        domain: customSubdomain,
        registryAddress,
        connection: {
          networkNameOrChainId: network
        }
      }
    });

    expect(getContentHashFromDomainData).toEqual(cid);
    expect(getContentHashFromDomainError).toBeUndefined();
  });

  it("should set address and fetch it", async () => {
    const {
      data: setAddressData,
      error: setAddressError,
    } = await ownerClient.invoke({
      uri: ensUri,
      method: "setAddress",
      args: {
        domain: customTld,
        address: anotherOwner,
        resolverAddress,
        connection: {
          networkNameOrChainId: network
        }
      }
    });

    expect(setAddressData).toBeDefined();
    expect(setAddressError).toBeUndefined();

    const {
      data: getAddressData,
      error: getAddressError,
    } = await ownerClient.invoke({
      uri: ensUri,
      method: "getAddress",
      args: {
        domain: customTld,
        resolverAddress,
        connection: {
          networkNameOrChainId: network
        }
      }
    });

    expect(getAddressData).toEqual(anotherOwner);
    expect(getAddressError).toBeUndefined();

    const {
      data: getAddressFromDomainData,
      error: getAddressFromDomainError,
    } = await ownerClient.invoke({
      uri: ensUri,
      method: "getAddressFromDomain",
      args: {
        domain: customTld,
        registryAddress,
        connection: {
          networkNameOrChainId: network
        }
      }
    });

    expect(getAddressFromDomainData).toEqual(
      anotherOwner
    );
    expect(getAddressFromDomainError).toBeUndefined();
  });

  it("should set reverse registry", async () => {
    const {
      data: reverseRegistryData,
      error: reverseRegistryError,
    } = await ownerClient.invoke({
      uri: ensUri,
      method: "reverseRegisterDomain",
      args: {
        domain: customTld,
        reverseRegistryAddress,
        owner,
        connection: {
          networkNameOrChainId: network
        }
      }
    });

    expect(reverseRegistryData).toBeDefined();
    expect(reverseRegistryError).toBeUndefined();
  });

  it("should fetch name based on address from registry and resolver", async () => {
    const {
      data: getNameFromAddressData,
      error: getNameFromAddressError,
    } = await ownerClient.invoke({
      uri: ensUri,
      method: "getNameFromAddress",
      args: {
        address: owner,
        registryAddress,
        connection: {
          networkNameOrChainId: network
        }
      }
    });

    expect(getNameFromAddressData).toEqual(customTld);
    expect(getNameFromAddressError).toBeUndefined();

    const {
      data: getNameFromReverseResolverData,
      error: getNameFromReverseResolverError,
    } = await ownerClient.invoke({
      uri: ensUri,
      method: "getNameFromReverseResolver",
      args: {
        address: owner,
        resolverAddress,
        connection: {
          networkNameOrChainId: network
        }
      }
    });

    expect(getNameFromReverseResolverData).toEqual(
      customTld
    );
    expect(getNameFromReverseResolverError).toBeUndefined();
  });

  it("should set and get text record from subdomain", async () => {
    const key = "snapshot";
    const value = "QmHash";

    const {
      data: setTextRecordData,
      error: setTextRecordError,
    } = await ownerClient.invoke({
      uri: ensUri,
      method: "setTextRecord",
      args: {
        domain: customTld,
        resolverAddress,
        key,
        value,
        connection: {
          networkNameOrChainId: network
        }
      }
    });

    expect(setTextRecordData).toBeDefined();
    expect(setTextRecordError).toBeUndefined();

    const {
      data: getTextRecordData,
      error: getTextRecordError,
    } = await ownerClient.invoke({
      uri: ensUri,
      method: "getTextRecord",
      args: {
        domain: customTld,
        resolverAddress,
        key,
        connection: {
          networkNameOrChainId: network
        }
      }
    });

    expect(getTextRecordData).toEqual(value);
    expect(getTextRecordError).toBeUndefined();
  });

  it("should configure open domain", async () => {
    const {
      data: configureOpenDomainData,
      error: configureOpenDomainError,
    } = await ownerClient.invoke<{
        fifsRegistrarAddress: string;
        setOwnerTxReceipt: any;
      }>({
      uri: ensUri,
      method: "configureOpenDomain",
      args: {
        tld: openSubdomain,
        owner,
        registryAddress,
        resolverAddress,
        registrarAddress,
        connection: {
          networkNameOrChainId: network
        }
      }
    });

    expect(configureOpenDomainData).toBeDefined();
    expect(configureOpenDomainError).toBeUndefined();

    const { data: getOwnerData } = await ownerClient.invoke({
      uri: ensUri,
      method: "getOwner",
      args: {
        domain: openSubdomain,
        registryAddress,
        connection: {
          networkNameOrChainId: network
        }
      }
    });

    expect(getOwnerData).toEqual(
      configureOpenDomainData?.fifsRegistrarAddress
    );

    customFifsRegistrarAddress = configureOpenDomainData?.fifsRegistrarAddress!;
  });

  it("should create subdomain in open domain", async () => {
    const {
      data: createSubdomainInOpenDomainData,
      error: createSubdomainInOpenDomainError,
    } = await anotherOwnerClient.invoke({
      uri: ensUri,
      method: "createSubdomainInOpenDomain",
      args: {
        label: "label",
        domain: openSubdomain,
        owner: anotherOwner,
        fifsRegistrarAddress: customFifsRegistrarAddress,
        registryAddress,
        resolverAddress,
        connection: {
          networkNameOrChainId: network
        }
      }
    });

    expect(
      createSubdomainInOpenDomainData
    ).toBeDefined();
    expect(createSubdomainInOpenDomainError).toBeUndefined();
  });

  it("should create subdomain in open domain and set content hash", async () => {
    const cid = "0x64EC88CA00B268E5BA1A35678A1B5316D212F4F366B2477232534A8AECA37F3C".toLowerCase();

    const {
      data: createSubdomainInOpenDomainAndSetContentHashData,
      error: createSubdomainInOpenDomainAndSetContentHashError,
    } = await anotherOwnerClient.invoke({
      uri: ensUri,
      method: "createSubdomainInOpenDomainAndSetContentHash",
      args: {
        cid,
        label: "label2",
        domain: openSubdomain,
        owner: anotherOwner,
        fifsRegistrarAddress: customFifsRegistrarAddress,
        registryAddress,
        resolverAddress,
        connection: {
          networkNameOrChainId: network
        }
      }
    });

    expect(
      createSubdomainInOpenDomainAndSetContentHashData
    ).toBeDefined();
    expect(createSubdomainInOpenDomainAndSetContentHashError).toBeUndefined();

    const {
      data: getContentHashFromDomainData,
      error: getContentHashFromDomainError,
    } = await ownerClient.invoke({
      uri: ensUri,
      method: "getContentHashFromDomain",
      args: {
        domain: "label2." + openSubdomain,
        registryAddress,
        connection: {
          networkNameOrChainId: network
        }
      }
    });

    expect(getContentHashFromDomainData).toEqual(cid);
    expect(getContentHashFromDomainError).toBeUndefined();
  });
});
