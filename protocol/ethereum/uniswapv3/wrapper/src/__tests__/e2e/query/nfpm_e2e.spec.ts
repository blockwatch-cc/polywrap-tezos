import { ClientConfig, Web3ApiClient } from "@web3api/client-js";
import { buildAndDeployApi, initTestEnvironment, stopTestEnvironment } from "@web3api/test-env-js";
import { getFakeTestToken, getPlugins } from "../testUtils";
import path from "path";
import { createPool, encodeSqrtRatioX96, createCallParameters, addCallParameters, collectCallParameters, removeCallParameters, safeTransferFromParameters, feeAmountToTickSpacing, createPosition } from "../wrappedQueries";
import { ChainIdEnum, FeeAmountEnum, Pool, SafeTransferOptions, Token, TokenAmount } from "../types";

jest.setTimeout(120000);

describe('NonfungiblePositionManager', () => {
  const recipient = '0x0000000000000000000000000000000000000003';
  const sender = '0x0000000000000000000000000000000000000004';
  const tokenId = "1";
  const slippageTolerance = "0.01";
  const deadline = "123";

  const ETHER: Token = {
    chainId: ChainIdEnum.MAINNET,
    address: "",
    currency: {
      decimals: 18,
      name: "Ether",
      symbol: "ETH",
    },
  }
  const weth: Token = {
    chainId: ChainIdEnum.MAINNET,
    address: "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2",
    currency: {
      decimals: 18,
      symbol: "WETH",
      name: "Wrapped Ether",
    },
  };

  let token0: Token;
  let token1: Token;
  let pool_0_1: Pool;
  let pool_1_weth: Pool;

  let client: Web3ApiClient;
  let ensUri: string;

  beforeAll(async () => {
    const { ipfs, ethereum, ensAddress, registrarAddress, resolverAddress } = await initTestEnvironment();
    // get client
    const config: ClientConfig = getPlugins(ethereum, ipfs, ensAddress);
    client = new Web3ApiClient(config);
    // deploy api
    const apiPath: string = path.resolve(__dirname + "/../../../../");
    const api = await buildAndDeployApi({
      apiAbsPath: apiPath,
      ipfsProvider: ipfs,
      ensRegistryAddress: ensAddress,
      ethereumProvider: ethereum,
      ensRegistrarAddress: registrarAddress,
      ensResolverAddress: resolverAddress,
    });
    ensUri = `ens/testnet/${api.ensDomain}`;
    // set up test case data
    token0 = getFakeTestToken(0);
    token1 = getFakeTestToken(1);
    const sqrtRatioX96: string = await encodeSqrtRatioX96(client, ensUri, 1, 1);
    pool_0_1 = await createPool(client, ensUri, token0, token1, FeeAmountEnum.MEDIUM, sqrtRatioX96, 0, 0, []);
    pool_1_weth = await createPool(client, ensUri, token1, weth, FeeAmountEnum.MEDIUM, sqrtRatioX96, 0, 0, []);
  });

  afterAll(async () => {
    await stopTestEnvironment();
  });

  describe('createCallParameters', () => {
    it('succeeds', async () => {
      const { calldata, value } = await createCallParameters(client, ensUri, pool_0_1);

      expect(calldata).toEqual(
        '0x13ead562000000000000000000000000000000000000000000000000000000000000000100000000000000000000000000000000000000000000000000000000000000020000000000000000000000000000000000000000000000000000000000000bb80000000000000000000000000000000000000001000000000000000000000000'
      )
      expect(value).toEqual('0x00')
    })
  })

  describe('addCallParameters', () => {
    it('throws if liquidity is 0', async () => {
      await expect(
        addCallParameters(client, ensUri,
          await createPosition(client, ensUri,
            pool_0_1,
            -(await feeAmountToTickSpacing(client, ensUri, FeeAmountEnum.MEDIUM)),
            await feeAmountToTickSpacing(client, ensUri, FeeAmountEnum.MEDIUM),
            0
          ),
          { recipient, slippageTolerance, deadline }
        )
      ).rejects.toThrow("ZERO_LIQUIDITY: position liquidity must exceed zero");
    });

    it('throws if pool does not involve ether and useNative is true', async () => {
      await expect(
        addCallParameters(client, ensUri,
          await createPosition(client, ensUri,
            pool_0_1,
            -(await feeAmountToTickSpacing(client, ensUri, FeeAmountEnum.MEDIUM)),
            await feeAmountToTickSpacing(client, ensUri, FeeAmountEnum.MEDIUM),
            1
          ),
          { recipient, slippageTolerance, deadline, useNative: ETHER }
        )
      ).rejects.toThrow("NO_WETH: the native token provided with the useNative option must be involved in the position pool");
    });

    it('succeeds for mint', async () => {
      const { calldata, value } = await addCallParameters(client, ensUri,
        await createPosition(client, ensUri,
          pool_0_1,
          -(await feeAmountToTickSpacing(client, ensUri, FeeAmountEnum.MEDIUM)),
          await feeAmountToTickSpacing(client, ensUri, FeeAmountEnum.MEDIUM),
          1
        ),
        { recipient, slippageTolerance, deadline }
      );

      expect(calldata).toEqual(
        '0x88316456000000000000000000000000000000000000000000000000000000000000000100000000000000000000000000000000000000000000000000000000000000020000000000000000000000000000000000000000000000000000000000000bb8ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffc4000000000000000000000000000000000000000000000000000000000000003c00000000000000000000000000000000000000000000000000000000000000010000000000000000000000000000000000000000000000000000000000000001000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000003000000000000000000000000000000000000000000000000000000000000007b'
      );
      expect(value).toEqual('0x00');
    });

    it('succeeds for increase', async () => {
      const { calldata, value } = await addCallParameters(client, ensUri,
        await createPosition(client, ensUri,
          pool_0_1,
          -(await feeAmountToTickSpacing(client, ensUri, FeeAmountEnum.MEDIUM)),
          await feeAmountToTickSpacing(client, ensUri, FeeAmountEnum.MEDIUM),
          1
        ),
        { tokenId, slippageTolerance, deadline }
      );

      expect(calldata).toEqual(
        '0x219f5d1700000000000000000000000000000000000000000000000000000000000000010000000000000000000000000000000000000000000000000000000000000001000000000000000000000000000000000000000000000000000000000000000100000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000007b'
      );
      expect(value).toEqual('0x00');
    });

    it('createPool', async () => {
      const { calldata, value } = await addCallParameters(client, ensUri,
        await createPosition(client, ensUri,
          pool_0_1,
          -(await feeAmountToTickSpacing(client, ensUri, FeeAmountEnum.MEDIUM)),
          await feeAmountToTickSpacing(client, ensUri, FeeAmountEnum.MEDIUM),
          1
        ),
        { recipient, slippageTolerance, deadline, createPool: true }
      );

      expect(calldata).toEqual(
        '0xac9650d80000000000000000000000000000000000000000000000000000000000000020000000000000000000000000000000000000000000000000000000000000000200000000000000000000000000000000000000000000000000000000000000400000000000000000000000000000000000000000000000000000000000000100000000000000000000000000000000000000000000000000000000000000008413ead562000000000000000000000000000000000000000000000000000000000000000100000000000000000000000000000000000000000000000000000000000000020000000000000000000000000000000000000000000000000000000000000bb8000000000000000000000000000000000000000100000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000016488316456000000000000000000000000000000000000000000000000000000000000000100000000000000000000000000000000000000000000000000000000000000020000000000000000000000000000000000000000000000000000000000000bb8ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffc4000000000000000000000000000000000000000000000000000000000000003c00000000000000000000000000000000000000000000000000000000000000010000000000000000000000000000000000000000000000000000000000000001000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000003000000000000000000000000000000000000000000000000000000000000007b00000000000000000000000000000000000000000000000000000000'
      );
      expect(value).toEqual('0x00');
    });

    it('useNative', async () => {
      const { calldata, value } = await addCallParameters(client, ensUri,
        await createPosition(client, ensUri,
          pool_1_weth,
          -(await feeAmountToTickSpacing(client, ensUri, FeeAmountEnum.MEDIUM)),
          await feeAmountToTickSpacing(client, ensUri, FeeAmountEnum.MEDIUM),
          1
        ),
        { recipient, slippageTolerance, deadline, useNative: ETHER }
      );

      expect(calldata).toEqual(
        '0xac9650d800000000000000000000000000000000000000000000000000000000000000200000000000000000000000000000000000000000000000000000000000000002000000000000000000000000000000000000000000000000000000000000004000000000000000000000000000000000000000000000000000000000000001e00000000000000000000000000000000000000000000000000000000000000164883164560000000000000000000000000000000000000000000000000000000000000002000000000000000000000000c02aaa39b223fe8d0a0e5c4f27ead9083c756cc20000000000000000000000000000000000000000000000000000000000000bb8ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffc4000000000000000000000000000000000000000000000000000000000000003c00000000000000000000000000000000000000000000000000000000000000010000000000000000000000000000000000000000000000000000000000000001000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000003000000000000000000000000000000000000000000000000000000000000007b00000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000412210e8a00000000000000000000000000000000000000000000000000000000'
      );
      expect(value).toEqual('0x01');
    });
  });

  describe('collectCallParameters', () => {
    it('works', async () => {
      const { calldata, value } = await collectCallParameters(client, ensUri, {
        tokenId,
        expectedCurrencyOwed0: { token: token0, amount: "0" },
        expectedCurrencyOwed1: { token: token1, amount: "0" },
        recipient
       });

      expect(calldata).toEqual(
        '0xfc6f78650000000000000000000000000000000000000000000000000000000000000001000000000000000000000000000000000000000000000000000000000000000300000000000000000000000000000000ffffffffffffffffffffffffffffffff00000000000000000000000000000000ffffffffffffffffffffffffffffffff'
      );
      expect(value).toEqual('0x00');
    });

    it('works with eth', async () => {
      const { calldata, value } = await collectCallParameters(client, ensUri, {
        tokenId,
        expectedCurrencyOwed0: { token: token1, amount: "0" },
        expectedCurrencyOwed1: { token: ETHER, amount: "0" },
        recipient
      });

      expect(calldata).toEqual(
        '0xac9650d8000000000000000000000000000000000000000000000000000000000000002000000000000000000000000000000000000000000000000000000000000000030000000000000000000000000000000000000000000000000000000000000060000000000000000000000000000000000000000000000000000000000000012000000000000000000000000000000000000000000000000000000000000001a00000000000000000000000000000000000000000000000000000000000000084fc6f78650000000000000000000000000000000000000000000000000000000000000001000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000ffffffffffffffffffffffffffffffff00000000000000000000000000000000ffffffffffffffffffffffffffffffff00000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000004449404b7c00000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000003000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000064df2ab5bb00000000000000000000000000000000000000000000000000000000000000020000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000300000000000000000000000000000000000000000000000000000000'
      );
      expect(value).toEqual('0x00');
    });
  });

  describe('removeCallParameters', () => {
    it('throws for 0 liquidity', async () => {
      await expect(async () =>
        removeCallParameters(client, ensUri,
          await createPosition(client, ensUri,
            pool_0_1,
            -(await feeAmountToTickSpacing(client, ensUri, FeeAmountEnum.MEDIUM)),
            await feeAmountToTickSpacing(client, ensUri, FeeAmountEnum.MEDIUM),
            0
          ),
          {
            tokenId,
            liquidityPercentage: "1",
            slippageTolerance,
            deadline,
            collectOptions: {
              tokenId,
              expectedCurrencyOwed0: { token: token0, amount: "0" },
              expectedCurrencyOwed1: { token: token1, amount: "0" },
              recipient
            }
          }
        )
      ).rejects.toThrow('ZERO_LIQUIDITY');
    });

    it('throws for 0 liquidity from small percentage', async () => {
      await expect(async () =>
        removeCallParameters(client, ensUri,
          await createPosition(client, ensUri,
            pool_0_1,
            -(await feeAmountToTickSpacing(client, ensUri, FeeAmountEnum.MEDIUM)),
            await feeAmountToTickSpacing(client, ensUri, FeeAmountEnum.MEDIUM),
            50
          ),
          {
            tokenId,
            liquidityPercentage: "0.01",
            slippageTolerance,
            deadline,
            collectOptions: {
              tokenId,
              expectedCurrencyOwed0: { token: token0, amount: "0" },
              expectedCurrencyOwed1: { token: token1, amount: "0" },
              recipient
            }
          }
        )
      ).rejects.toThrow('ZERO_LIQUIDITY');
    });

    it('throws for bad burn', async () => {
      await expect(async () =>
        removeCallParameters(client, ensUri,
          await createPosition(client, ensUri,
            pool_0_1,
            -(await feeAmountToTickSpacing(client, ensUri, FeeAmountEnum.MEDIUM)),
            await feeAmountToTickSpacing(client, ensUri, FeeAmountEnum.MEDIUM),
            50
          ),
          {
            tokenId,
            liquidityPercentage: "0.99",
            slippageTolerance,
            deadline,
            burnToken: true,
            collectOptions: {
              tokenId,
              expectedCurrencyOwed0: { token: token0, amount: "0" },
              expectedCurrencyOwed1: { token: token1, amount: "0" },
              recipient
            }
          }
        )
      ).rejects.toThrow('CANNOT_BURN');
    });

    it('works', async () => {
      const { calldata, value } = await removeCallParameters(client, ensUri,
        await createPosition(client, ensUri,
          pool_0_1,
          -(await feeAmountToTickSpacing(client, ensUri, FeeAmountEnum.MEDIUM)),
          await feeAmountToTickSpacing(client, ensUri, FeeAmountEnum.MEDIUM),
          100
        ),
        {
          tokenId,
          liquidityPercentage: "1",
          slippageTolerance,
          deadline,
          collectOptions: {
            tokenId,
            expectedCurrencyOwed0: { token: token0, amount: "0" },
            expectedCurrencyOwed1: { token: token1, amount: "0" },
            recipient
          }
        }
      );

      expect(calldata).toEqual(
        '0xac9650d8000000000000000000000000000000000000000000000000000000000000002000000000000000000000000000000000000000000000000000000000000000020000000000000000000000000000000000000000000000000000000000000040000000000000000000000000000000000000000000000000000000000000012000000000000000000000000000000000000000000000000000000000000000a40c49ccbe0000000000000000000000000000000000000000000000000000000000000001000000000000000000000000000000000000000000000000000000000000006400000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000007b000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000084fc6f78650000000000000000000000000000000000000000000000000000000000000001000000000000000000000000000000000000000000000000000000000000000300000000000000000000000000000000ffffffffffffffffffffffffffffffff00000000000000000000000000000000ffffffffffffffffffffffffffffffff00000000000000000000000000000000000000000000000000000000'
      );
      expect(value).toEqual('0x00');
    });

    it('works for partial', async () => {
      const { calldata, value } = await removeCallParameters(client, ensUri,
        await createPosition(client, ensUri,
          pool_0_1,
          -(await feeAmountToTickSpacing(client, ensUri, FeeAmountEnum.MEDIUM)),
          await feeAmountToTickSpacing(client, ensUri, FeeAmountEnum.MEDIUM),
          100
        ),
        {
          tokenId,
          liquidityPercentage: "0.5",
          slippageTolerance,
          deadline,
          collectOptions: {
            tokenId,
            expectedCurrencyOwed0: { token: token0, amount: "0" },
            expectedCurrencyOwed1: { token: token1, amount: "0" },
            recipient
          }
        }
      );

      expect(calldata).toEqual(
        '0xac9650d8000000000000000000000000000000000000000000000000000000000000002000000000000000000000000000000000000000000000000000000000000000020000000000000000000000000000000000000000000000000000000000000040000000000000000000000000000000000000000000000000000000000000012000000000000000000000000000000000000000000000000000000000000000a40c49ccbe0000000000000000000000000000000000000000000000000000000000000001000000000000000000000000000000000000000000000000000000000000003200000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000007b000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000084fc6f78650000000000000000000000000000000000000000000000000000000000000001000000000000000000000000000000000000000000000000000000000000000300000000000000000000000000000000ffffffffffffffffffffffffffffffff00000000000000000000000000000000ffffffffffffffffffffffffffffffff00000000000000000000000000000000000000000000000000000000'
      );
      expect(value).toEqual('0x00');
    });

    it('works with eth', async () => {
      const ethAmount: TokenAmount = {
        token: ETHER,
        amount: "0",
      }
      const tokenAmount: TokenAmount = {
        token: token1,
        amount: "0",
      }
      const { calldata, value } = await removeCallParameters(client, ensUri,
        await createPosition(client, ensUri,
          pool_1_weth,
          -(await feeAmountToTickSpacing(client, ensUri, FeeAmountEnum.MEDIUM)),
          await feeAmountToTickSpacing(client, ensUri, FeeAmountEnum.MEDIUM),
          100
        ),
        {
          tokenId,
          liquidityPercentage: "1",
          slippageTolerance,
          deadline,
          collectOptions: {
            tokenId,
            expectedCurrencyOwed0: pool_1_weth.token0.address === token1.address ? tokenAmount : ethAmount,
            expectedCurrencyOwed1: pool_1_weth.token0.address === token1.address ? ethAmount : tokenAmount,
            recipient
          }
        }
      );

      expect(calldata).toEqual(
        '0xac9650d80000000000000000000000000000000000000000000000000000000000000020000000000000000000000000000000000000000000000000000000000000000400000000000000000000000000000000000000000000000000000000000000800000000000000000000000000000000000000000000000000000000000000160000000000000000000000000000000000000000000000000000000000000022000000000000000000000000000000000000000000000000000000000000002a000000000000000000000000000000000000000000000000000000000000000a40c49ccbe0000000000000000000000000000000000000000000000000000000000000001000000000000000000000000000000000000000000000000000000000000006400000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000007b000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000084fc6f78650000000000000000000000000000000000000000000000000000000000000001000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000ffffffffffffffffffffffffffffffff00000000000000000000000000000000ffffffffffffffffffffffffffffffff00000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000004449404b7c00000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000003000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000064df2ab5bb00000000000000000000000000000000000000000000000000000000000000020000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000300000000000000000000000000000000000000000000000000000000'
      );
      expect(value).toEqual('0x00');
    });

    it('works for partial with eth', async () => {
      const ethAmount: TokenAmount = {
        token: ETHER,
        amount: "0",
      };
      const tokenAmount: TokenAmount = {
        token: token1,
        amount: "0",
      };

      const { calldata, value } = await removeCallParameters(client, ensUri,
        await createPosition(client, ensUri,
          pool_1_weth,
          -(await feeAmountToTickSpacing(client, ensUri, FeeAmountEnum.MEDIUM)),
          await feeAmountToTickSpacing(client, ensUri, FeeAmountEnum.MEDIUM),
          100
        ),
        {
          tokenId,
          liquidityPercentage: "0.5",
          slippageTolerance,
          deadline,
          collectOptions: {
            tokenId,
            expectedCurrencyOwed0: pool_1_weth.token0.address === token1.address ? tokenAmount : ethAmount,
            expectedCurrencyOwed1: pool_1_weth.token0.address === token1.address ? ethAmount : tokenAmount,
            recipient
          }
        }
      );

      expect(calldata).toEqual(
        '0xac9650d80000000000000000000000000000000000000000000000000000000000000020000000000000000000000000000000000000000000000000000000000000000400000000000000000000000000000000000000000000000000000000000000800000000000000000000000000000000000000000000000000000000000000160000000000000000000000000000000000000000000000000000000000000022000000000000000000000000000000000000000000000000000000000000002a000000000000000000000000000000000000000000000000000000000000000a40c49ccbe0000000000000000000000000000000000000000000000000000000000000001000000000000000000000000000000000000000000000000000000000000003200000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000007b000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000084fc6f78650000000000000000000000000000000000000000000000000000000000000001000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000ffffffffffffffffffffffffffffffff00000000000000000000000000000000ffffffffffffffffffffffffffffffff00000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000004449404b7c00000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000003000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000064df2ab5bb00000000000000000000000000000000000000000000000000000000000000020000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000300000000000000000000000000000000000000000000000000000000'
      );
      expect(value).toEqual('0x00')
    });
  });

  describe('safeTransferFromParameters', () => {
    it('succeeds no data param', async () => {
      const options: SafeTransferOptions = {
        sender,
        recipient,
        tokenId
      };
      const { calldata, value } = await safeTransferFromParameters(client, ensUri, options);

      expect(calldata).toEqual(
        '0x42842e0e000000000000000000000000000000000000000000000000000000000000000400000000000000000000000000000000000000000000000000000000000000030000000000000000000000000000000000000000000000000000000000000001'
      );
      expect(value).toEqual('0x00')
    });

    it('succeeds data param', async () => {
      const data = '0x0000000000000000000000000000000000009004';
      const options: SafeTransferOptions = {
        sender,
        recipient,
        tokenId,
        data
      }
      const { calldata, value } = await safeTransferFromParameters(client, ensUri, options);

      expect(calldata).toEqual(
        '0xb88d4fde000000000000000000000000000000000000000000000000000000000000000400000000000000000000000000000000000000000000000000000000000000030000000000000000000000000000000000000000000000000000000000000001000000000000000000000000000000000000000000000000000000000000008000000000000000000000000000000000000000000000000000000000000000140000000000000000000000000000000000009004000000000000000000000000'
      );
      expect(value).toEqual('0x00')
    });
  });
});