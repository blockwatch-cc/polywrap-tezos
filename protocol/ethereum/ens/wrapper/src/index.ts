import {keccak256, namehash} from "./utils";
import {
  Args_checkIfRecordExists,
  Args_configureOpenDomain,
  Args_createSubdomainInOpenDomain,
  Args_createSubdomainInOpenDomainAndSetContentHash,
  Args_deployFIFSRegistrar,
  Args_getAddress,
  Args_getAddressFromDomain,
  Args_getContentHash,
  Args_getContentHashFromDomain,
  Args_getExpiryTimes,
  Args_getNameFromAddress,
  Args_getNameFromReverseResolver,
  Args_getOwner,
  Args_getResolver,
  Args_getReverseResolver,
  Args_getTextRecord,
  Args_registerDomain,
  Args_registerDomainAndSubdomainsRecursively,
  Args_registerSubdomainsRecursively,
  Args_registerSubnodeOwnerWithFIFSRegistrar,
  Args_reverseRegisterDomain,
  Args_setAddress,
  Args_setAddressFromDomain,
  Args_setContentHash,
  Args_setContentHashFromDomain,
  Args_setName,
  Args_setOwner,
  Args_setRecord,
  Args_setResolver,
  Args_setSubdomainOwner,
  Args_setSubdomainRecord,
  Args_setTextRecord,
  ConfigureOpenDomainResponse,
  CreateSubdomainInOpenDomainAndSetContentHashResponse,
  CreateSubdomainInOpenDomainResponse,
  Ethereum_Module,
  Ethereum_TxResponse,
  RegistrationResult,
  TxOverrides,
} from "./wrap";
import { BigInt } from "@polywrap/wasm-as";
import {abi, bytecode} from "./contracts/FIFSRegistrar"

export function getResolver(args: Args_getResolver): string {
  const domain = namehash(args.domain);

  const resolverAddress = Ethereum_Module.callContractView({
    address: args.registryAddress,
    method: "function resolver(bytes32 node) external view returns (address)",
    args: [domain],
    connection: args.connection,
  });

  return resolverAddress.unwrap();
}

export function getOwner(args: Args_getOwner): string {
  const owner = Ethereum_Module.callContractView({
    address: args.registryAddress,
    method: "function owner(bytes32 node) external view returns (address)",
    args: [namehash(args.domain)],
    connection: args.connection,
  });

  return owner.unwrap();
}

export function checkIfRecordExists(args: Args_checkIfRecordExists): bool {
  const recordExists = Ethereum_Module.callContractView({
    address: args.registryAddress,
    method: "function recordExists(bytes32 node) external view returns (address)",
    args: [namehash(args.domain)],
    connection: args.connection,
  });

  const result = recordExists.unwrap();

  return result == "0x0000000000000000000000000000000000000001";
}

export function getAddress(args: Args_getAddress): string {
  const address = Ethereum_Module.callContractView({
    address: args.resolverAddress,
    method: "function addr(bytes32 node) external view returns (address)",
    args: [namehash(args.domain)],
    connection: args.connection,
  });

  return address.unwrap();
}

export function getContentHash(args: Args_getContentHash): string {
  const hash = Ethereum_Module.callContractView({
    address: args.resolverAddress,
    method: "function contenthash(bytes32 node) external view returns (bytes)",
    args: [namehash(args.domain)],
    connection: args.connection,
  });

  return hash.unwrap();
}

export function getAddressFromDomain(
  args: Args_getAddressFromDomain
): string {
  const resolverAddress = getResolver({
    registryAddress: args.registryAddress,
    domain: args.domain,
    connection: args.connection,
  });

  const address = Ethereum_Module.callContractView({
    address: resolverAddress,
    method: "function addr(bytes32 node) external view returns (address)",
    args: [namehash(args.domain)],
    connection: args.connection,
  });

  return address.unwrap();
}

export function getContentHashFromDomain(
  args: Args_getContentHashFromDomain
): string {
  const resolverAddress = getResolver({
    registryAddress: args.registryAddress,
    domain: args.domain,
    connection: args.connection,
  });

  const hash = Ethereum_Module.callContractView({
    address: resolverAddress,
    method: "function contenthash(bytes32 node) external view returns (bytes)",
    args: [namehash(args.domain)],
    connection: args.connection,
  });

  return hash.unwrap();
}

export function getExpiryTimes(args: Args_getExpiryTimes): string {
  const label = args.domain.split(".")[0];

  const expiryTime = Ethereum_Module.callContractView({
    address: args.registrarAddress,
    method:
      "function expiryTimes(bytes32 label) external view returns (uint256)",
    args: [keccak256(label)],
    connection: args.connection,
  });

  return expiryTime.unwrap();
}

export function getReverseResolver(args: Args_getReverseResolver): string {
  const address = namehash(args.address.substr(2) + ".addr.reverse");

  const resolverAddress = Ethereum_Module.callContractView({
    address: args.registryAddress,
    method: "function resolver(bytes32 node) external view returns (address)",
    args: [address],
    connection: args.connection,
  });

  return resolverAddress.unwrap();
}

export function getNameFromAddress(args: Args_getNameFromAddress): string {
  const address = namehash(args.address.substr(2) + ".addr.reverse");

  const resolverAddress = getReverseResolver({
    registryAddress: args.registryAddress,
    address: args.address,
    connection: args.connection,
  });

  const name = Ethereum_Module.callContractView({
    address: resolverAddress,
    method: "function name(bytes32 node) external view returns (string)",
    args: [address],
    connection: args.connection,
  });

  return name.unwrap();
}

export function getNameFromReverseResolver(
  args: Args_getNameFromReverseResolver
): string {
  const address = namehash(args.address.substr(2) + ".addr.reverse");

  const name = Ethereum_Module.callContractView({
    address: args.resolverAddress,
    method: "function name(bytes32 node) external view returns (string)",
    args: [address],
    connection: args.connection,
  });

  return name.unwrap();
}

export function getTextRecord(args: Args_getTextRecord): string {
  const value = Ethereum_Module.callContractView({
    address: args.resolverAddress,
    method: "function text(bytes32 node, string value) external view returns (string)",
    args: [namehash(args.domain), args.key],
    connection: args.connection,
  });

  return value.unwrap();
}

export function setResolver(args: Args_setResolver): Ethereum_TxResponse {
  const txOverrides: TxOverrides =
    args.txOverrides === null
      ? {gasLimit: null, gasPrice: null}
      : args.txOverrides!;
  const setResolverTx = Ethereum_Module.callContractMethod({
    address: args.registryAddress,
    method: "function setResolver(bytes32 node, address owner)",
    args: [namehash(args.domain), args.resolverAddress],
    connection: args.connection,
    txOverrides: {
      value: null,
      gasPrice: txOverrides.gasPrice,
      gasLimit: txOverrides.gasLimit,
    },
  });

  return setResolverTx.unwrap();
}

export function registerDomain(
  args: Args_registerDomain
): Ethereum_TxResponse {
  const label = args.domain.split(".")[0];
  const txOverrides: TxOverrides =
    args.txOverrides === null
      ? {gasLimit: null, gasPrice: null}
      : args.txOverrides!;
  const tx = Ethereum_Module.callContractMethod({
    address: args.registrarAddress,
    method: "function register(bytes32 label, address owner)",
    args: [keccak256(label), args.owner],
    connection: args.connection,
    txOverrides: {
      value: null,
      gasPrice: txOverrides.gasPrice,
      gasLimit: txOverrides.gasLimit,
    },
  });

  return tx.unwrap();
}

export function setOwner(args: Args_setOwner): Ethereum_TxResponse {
  const txOverrides: TxOverrides =
    args.txOverrides === null
      ? {gasLimit: null, gasPrice: null}
      : args.txOverrides!;
  const tx = Ethereum_Module.callContractMethod({
    address: args.registryAddress,
    method: "function setOwner(bytes32 node, address owner) external",
    args: [namehash(args.domain), args.newOwner],
    connection: args.connection,
    txOverrides: {
      gasLimit: txOverrides.gasLimit,
      gasPrice: txOverrides.gasPrice,
      value: null,
    },
  });

  return tx.unwrap();
}

export function setSubdomainOwner(
  args: Args_setSubdomainOwner
): Ethereum_TxResponse {
  const splitDomain = args.subdomain.split(".");
  const subdomainLabel = splitDomain[0];
  const domain = splitDomain.slice(1, splitDomain.length).join(".");

  const txOverrides: TxOverrides =
    args.txOverrides === null
      ? {gasLimit: null, gasPrice: null}
      : args.txOverrides!;
  const tx = Ethereum_Module.callContractMethod({
    address: args.registryAddress,
    method:
      "function setSubnodeOwner(bytes32 node, bytes32 label, address owner) external",
    args: [namehash(domain), keccak256(subdomainLabel), args.owner],
    connection: args.connection,
    txOverrides: {
      gasLimit: txOverrides.gasLimit,
      gasPrice: txOverrides.gasPrice,
      value: null,
    },
  });

  return tx.unwrap();
}

export function setSubdomainRecord(
  args: Args_setSubdomainRecord
): Ethereum_TxResponse {
  const txOverrides: TxOverrides =
    args.txOverrides === null
      ? {gasLimit: null, gasPrice: null}
      : args.txOverrides!;
  const tx = Ethereum_Module.callContractMethod({
    address: args.registryAddress,
    method:
      "function setSubnodeRecord(bytes32 node, bytes32 label, address owner, address resolver, uint64 ttl)",
    args: [
      namehash(args.domain),
      keccak256(args.label),
      args.owner,
      args.resolverAddress,
      args.ttl,
    ],
    connection: args.connection,
    txOverrides: {
      gasLimit: txOverrides.gasLimit,
      gasPrice: txOverrides.gasPrice,
      value: null,
    },
  });

  return tx.unwrap();
}

export function registerDomainAndSubdomainsRecursively(
  args: Args_registerDomainAndSubdomainsRecursively
): RegistrationResult[] {
  const registrationResults: RegistrationResult[] = []
  const splitDomain = args.domain.split(".");

  if (splitDomain.length < 2) {
    throw new Error("Expected subdomain/domain name. Examples: foo.eth, foo.bar.eth")
  }

  let rootDomain = splitDomain.slice(-1)[0];
  let subdomains = splitDomain.slice(0, -1).reverse();

  for (let i = 0; i < subdomains.length; i++) {
    subdomains[i] = `${subdomains[i]}.${i === 0? rootDomain: subdomains[i - 1]}`
  }

  for (let i = 0; i < subdomains.length; i++) {
    const result: RegistrationResult = {
      name: subdomains[i],
      didRegister: false,
      tx: null
    }

    const isRegistered = checkIfRecordExists({
      registryAddress: args.registryAddress,
      domain: subdomains[i],
      connection: args.connection
    });

    if (!isRegistered) {
      if(i === 0) {
        // Main domain case
        result.tx = registerDomain({
          domain: subdomains[i],
          registrarAddress: args.registrarAddress,
          registryAddress: args.registryAddress,
          owner: args.owner,
          connection: args.connection,
          txOverrides: args.txOverrides
        })

        setResolver({
          domain: subdomains[i],
          registryAddress: args.registryAddress,
          resolverAddress: args.resolverAddress,
          connection: args.connection,
          txOverrides: args.txOverrides
        })

      } else {
        // Subdomain case
        const label = subdomains[i].split('.')[0]
        const domain = subdomains[i].split('.').slice(1).join('.')
  
        result.tx = setSubdomainRecord({
          domain,
          label,
          owner: args.owner,
          resolverAddress: args.resolverAddress,
          ttl: args.ttl,
          registryAddress: args.registryAddress,
          connection: args.connection,
          txOverrides: args.txOverrides
        })
      }

      result.didRegister = true;
    }

    registrationResults.push(result)
  }

  return registrationResults;
}

export function registerSubdomainsRecursively(
  args: Args_registerSubdomainsRecursively
): RegistrationResult[] {
  const registrationResults: RegistrationResult[] = []
  const splitDomain = args.domain.split(".");

  if (splitDomain.length < 3) {
    throw new Error("Expected subdomain name. Example: foo.bar.eth")
  }

  let rootDomain = splitDomain.slice(-2).join(".");
  let subdomains = splitDomain.slice(0, -2).reverse();

  for (let i = 0; i < subdomains.length; i++) {
    subdomains[i] = `${subdomains[i]}.${i === 0 ? rootDomain : subdomains[i - 1]}`
  }

  for (let i = 0; i < subdomains.length; i++) {
    const result: RegistrationResult = {
      name: subdomains[i],
      didRegister: false,
      tx: null
    }

    const isRegistered = checkIfRecordExists({
      registryAddress: args.registryAddress,
      domain: subdomains[i],
      connection: args.connection
    });

    if (!isRegistered) {
      const label = subdomains[i].split('.')[0]
      const domain = subdomains[i].split('.').slice(1).join('.')

      result.tx = setSubdomainRecord({
        domain,
        label,
        owner: args.owner,
        resolverAddress: args.resolverAddress,
        ttl: args.ttl,
        registryAddress: args.registryAddress,
        connection: args.connection,
        txOverrides: args.txOverrides
      })

      result.didRegister = true;
    }

    registrationResults.push(result)
  }

  return registrationResults;
}

//TODO: Where could this be used on mainnet?
export function setRecord(args: Args_setRecord): Ethereum_TxResponse {
  const txOverrides: TxOverrides =
    args.txOverrides === null
      ? {gasLimit: null, gasPrice: null}
      : args.txOverrides!;
  const tx = Ethereum_Module.callContractMethod({
    address: args.registryAddress,
    method:
      "function setRecord(bytes32 node, address owner, address resolver, uint64 ttl)",
    args: [
      namehash(args.domain),
      args.owner,
      args.resolverAddress,
      args.ttl,
    ],
    connection: args.connection,
    txOverrides: {
      gasLimit: txOverrides.gasLimit,
      gasPrice: txOverrides.gasPrice,
      value: null,
    },
  });

  return tx.unwrap();
}

export function setName(args: Args_setName): Ethereum_TxResponse {
  const txOverrides: TxOverrides =
    args.txOverrides === null
      ? {gasLimit: null, gasPrice: null}
      : args.txOverrides!;
  const setNameTx = Ethereum_Module.callContractMethod({
    address: args.reverseRegistryAddress,
    method: "function setName(string name)",
    args: [args.domain],
    connection: args.connection,
    txOverrides: {
      gasLimit: txOverrides.gasLimit,
      gasPrice: txOverrides.gasPrice,
      value: null,
    },
  });

  return setNameTx.unwrap();
}

export function reverseRegisterDomain(
  args: Args_reverseRegisterDomain
): Ethereum_TxResponse {
  const txOverrides: TxOverrides =
    args.txOverrides === null
      ? {gasLimit: null, gasPrice: null}
      : args.txOverrides!;
  Ethereum_Module.callContractMethod({
    address: args.reverseRegistryAddress,
    method: "function claim(address owner)",
    args: [args.owner],
    connection: args.connection,
    txOverrides: {
      gasLimit: txOverrides.gasLimit,
      gasPrice: txOverrides.gasPrice,
      value: null,
    },
  });

  const setNameTx = setName({
    reverseRegistryAddress: args.reverseRegistryAddress,
    domain: args.domain,
    connection: args.connection,
    txOverrides: {
      gasLimit: txOverrides.gasLimit,
      gasPrice: txOverrides.gasPrice,
    },
  });

  return setNameTx;
}

export function setAddress(args: Args_setAddress): Ethereum_TxResponse {
  const txOverrides: TxOverrides =
    args.txOverrides === null
      ? {gasLimit: null, gasPrice: null}
      : args.txOverrides!;
  const setAddrTx = Ethereum_Module.callContractMethod({
    address: args.resolverAddress,
    method: "function setAddr(bytes32 node, address addr)",
    args: [namehash(args.domain), args.address],
    connection: args.connection,
    txOverrides: {
      gasLimit: txOverrides.gasLimit,
      gasPrice: txOverrides.gasPrice,
      value: null,
    },
  });

  return setAddrTx.unwrap();
}

export function setContentHash(
  args: Args_setContentHash
): Ethereum_TxResponse {
  const txOverrides: TxOverrides =
    args.txOverrides === null
      ? {gasLimit: null, gasPrice: null}
      : args.txOverrides!;
  const setContentHash = Ethereum_Module.callContractMethod({
    address: args.resolverAddress,
    method: "function setContenthash(bytes32 node, bytes hash)",
    args: [namehash(args.domain), args.cid],
    connection: args.connection,
    txOverrides: {
      gasLimit: txOverrides.gasLimit,
      gasPrice: txOverrides.gasPrice,
      value: null,
    },
  });

  return setContentHash.unwrap();
}

export function setAddressFromDomain(
  args: Args_setAddressFromDomain
): Ethereum_TxResponse {
  const resolverAddress = getResolver({
    domain: args.domain,
    registryAddress: args.registryAddress,
    connection: args.connection,
  });

  const txOverrides: TxOverrides =
    args.txOverrides === null
      ? {gasLimit: null, gasPrice: null}
      : args.txOverrides!;
  const setAddrTx = Ethereum_Module.callContractMethod({
    address: resolverAddress,
    method: "function setAddr(bytes32 node, address addr)",
    args: [namehash(args.domain), args.address],
    connection: args.connection,
    txOverrides: {
      gasLimit: txOverrides.gasLimit,
      gasPrice: txOverrides.gasPrice,
      value: null,
    },
  });

  return setAddrTx.unwrap();
}

export function setContentHashFromDomain(
  args: Args_setContentHashFromDomain
): Ethereum_TxResponse {
  const resolverAddress = getResolver({
    domain: args.domain,
    registryAddress: args.registryAddress,
    connection: args.connection,
  });

  const txOverrides: TxOverrides =
    args.txOverrides === null
      ? {gasLimit: null, gasPrice: null}
      : args.txOverrides!;
  const setContentHash = Ethereum_Module.callContractMethod({
    address: resolverAddress,
    method: "function setContenthash(bytes32 node, bytes hash)",
    args: [namehash(args.domain), args.cid],
    connection: args.connection,
    txOverrides: {
      gasLimit: txOverrides.gasLimit,
      gasPrice: txOverrides.gasPrice,
      value: null,
    },
  });

  return setContentHash.unwrap();
}

export function deployFIFSRegistrar(args: Args_deployFIFSRegistrar): string {
  const address = Ethereum_Module.deployContract({
    abi,
    bytecode,
    args: [args.registryAddress, namehash(args.tld)],
    connection: args.connection,
  });

  return address.unwrap();
}

export function registerSubnodeOwnerWithFIFSRegistrar(
  args: Args_registerSubnodeOwnerWithFIFSRegistrar
): Ethereum_TxResponse {
  const txOverrides: TxOverrides =
    args.txOverrides === null
      ? {gasLimit: null, gasPrice: null}
      : args.txOverrides!;
  const txHash = Ethereum_Module.callContractMethod({
    address: args.fifsRegistrarAddress,
    method: "function register(bytes32 label, address owner) external",
    args: [keccak256(args.label), args.owner],
    connection: args.connection,
    txOverrides: {
      gasLimit: txOverrides.gasLimit,
      gasPrice: txOverrides.gasPrice,
      value: null,
    },
  });

  return txHash.unwrap();
}

export function setTextRecord(args: Args_setTextRecord): Ethereum_TxResponse {
  const txOverrides: TxOverrides =
    args.txOverrides === null
      ? {gasLimit: null, gasPrice: null}
      : args.txOverrides!;
  const txHash = Ethereum_Module.callContractMethod({
    address: args.resolverAddress,
    method: "function setText(bytes32 node, string key, string value)",
    args: [namehash(args.domain), args.key, args.value],
    connection: args.connection,
    txOverrides: {
      gasLimit: txOverrides.gasLimit,
      gasPrice: txOverrides.gasPrice,
      value: null,
    },
  });

  return txHash.unwrap();
}

export function configureOpenDomain(
  args: Args_configureOpenDomain
): ConfigureOpenDomainResponse {
  const txOverrides: TxOverrides =
    args.txOverrides === null
      ? {gasLimit: null, gasPrice: null}
      : args.txOverrides!;

  const fifsRegistrarAddress = deployFIFSRegistrar({
    registryAddress: args.registryAddress,
    tld: args.tld,
    connection: args.connection,
    txOverrides,
  });

  const splitDomain = args.tld.split(".");
  const tldLabel = splitDomain[0];
  const tld = splitDomain.slice(1, splitDomain.length).join(".");

  const registerOpenDomainTxReceipt = registerDomain({
    registrarAddress: args.registrarAddress,
    registryAddress: args.registryAddress,
    domain: args.tld,
    owner: args.owner,
    connection: args.connection,
    txOverrides,
  });

  const setSubdomainRecordTxReceipt = setSubdomainRecord({
    domain: tld,
    label: tldLabel,
    owner: fifsRegistrarAddress,
    registryAddress: args.registryAddress,
    resolverAddress: args.resolverAddress,
    ttl: "0",
    connection: args.connection,
    txOverrides,
  });

  return {
    fifsRegistrarAddress,
    registerOpenDomainTxReceipt,
    setSubdomainRecordTxReceipt,
  };
}

export function createSubdomainInOpenDomain(
  args: Args_createSubdomainInOpenDomain
): CreateSubdomainInOpenDomainResponse {
  const txOverrides: TxOverrides =
    args.txOverrides === null
      ? {gasLimit: null, gasPrice: null}
      : args.txOverrides!;

  const registerSubdomainTxReceipt = registerSubnodeOwnerWithFIFSRegistrar({
    label: args.label,
    owner: args.owner,
    fifsRegistrarAddress: args.fifsRegistrarAddress,
    connection: args.connection,
    txOverrides,
  });

  const setResolverTxReceipt = setResolver({
    domain: args.label + "." + args.domain,
    registryAddress: args.registryAddress,
    resolverAddress: args.resolverAddress,
    connection: args.connection,
    txOverrides,
  });

  return {registerSubdomainTxReceipt, setResolverTxReceipt};
}

export function createSubdomainInOpenDomainAndSetContentHash(
  args: Args_createSubdomainInOpenDomainAndSetContentHash
): CreateSubdomainInOpenDomainAndSetContentHashResponse {
  const txOverrides: TxOverrides =
    args.txOverrides === null
      ? {gasLimit: null, gasPrice: null}
      : args.txOverrides!;

  const createSubdomainInOpenDomainTxReceipt = createSubdomainInOpenDomain({
    label: args.label,
    domain: args.domain,
    resolverAddress: args.resolverAddress,
    registryAddress: args.registryAddress,
    owner: args.owner,
    fifsRegistrarAddress: args.fifsRegistrarAddress,
    connection: args.connection,
    txOverrides,
  });

  const setContentHashReceiptTx = setContentHash({
    domain: args.label + "." + args.domain,
    cid: args.cid,
    resolverAddress: args.resolverAddress,
    connection: args.connection,
    txOverrides,
  });

  return {
    registerSubdomainTxReceipt: createSubdomainInOpenDomainTxReceipt.registerSubdomainTxReceipt,
    setResolverTxReceipt: createSubdomainInOpenDomainTxReceipt.setResolverTxReceipt,
    setContentHashReceiptTx,
  };
}

