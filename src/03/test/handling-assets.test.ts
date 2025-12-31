import { getAddress, bytesToHex } from "viem";
import { afterAll, describe, expect, it } from "vitest";
import {
  encodeAdvanceInput,
  encodeEtherDeposit,
  encodeErc20Deposit,
  encodeVoucherOutput,
  encodeErc20Transfer,
} from "../../../encoder";
import { rollups, spawn } from "@tuler/node-cartesi-machine";

const ETHER_PORTAL_ADDRESS = getAddress(
  "0xc70076a466789B595b50959cdc261227F0D70051"
);
const ERC20_PORTAL_ADDRESS = getAddress(
  "0xc700D6aDd016eECd59d989C028214Eaa0fCC0051"
);
const SENDER = getAddress("0x0000000000000000000000000000000000000001");
const TOKEN_ADDRESS = getAddress(
  "0x0000000000000000000000000000000000000002"
);

describe("Handling Assets Tests", () => {
  const remoteMachine = spawn().load("src/03/.cartesi/image");
  const machine = rollups(remoteMachine, { noRollback: true });
  const baseTime = Math.floor(Date.now() / 1000);

  it("should handle Ether deposit and emit voucher", () => {
    const amount = 1000000000000000000n; // 1 ETH in wei

    const depositPayload = encodeEtherDeposit({
      sender: SENDER,
      amount,
    });

    const { outputs } = machine.advance(
      encodeAdvanceInput({
        msgSender: ETHER_PORTAL_ADDRESS,
        blockTimestamp: BigInt(baseTime),
        payload: depositPayload,
      }),
      { collect: true }
    );

    expect(outputs.length).toBe(1);

    const expectedVoucher = encodeVoucherOutput({
      destination: SENDER,
      value: amount,
      payload: "0x",
    });
    expect(bytesToHex(outputs[0])).toBe(expectedVoucher);
  });

  it("should handle ERC20 deposit and emit voucher", () => {
    const amount = 1000n;

    const depositPayload = encodeErc20Deposit({
      tokenAddress: TOKEN_ADDRESS,
      sender: SENDER,
      amount,
    });

    const { outputs } = machine.advance(
      encodeAdvanceInput({
        msgSender: ERC20_PORTAL_ADDRESS,
        blockTimestamp: BigInt(baseTime + 1),
        payload: depositPayload,
      }),
      { collect: true }
    );

    expect(outputs.length).toBe(1);

    const expectedVoucher = encodeVoucherOutput({
      destination: TOKEN_ADDRESS,
      value: 0n,
      payload: encodeErc20Transfer({
        address: SENDER,
        amount,
      }),
    });
    expect(bytesToHex(outputs[0])).toBe(expectedVoucher);
  });

  afterAll(() => {
    machine.shutdown();
  });
});
