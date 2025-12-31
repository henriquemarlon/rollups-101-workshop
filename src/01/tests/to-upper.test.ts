import { getAddress, Hex, bytesToHex, stringToHex } from "viem";
import { afterAll, describe, expect, it } from "vitest";
import { encodeAdvanceInput, encodeNoticeOutput } from "../../../encoder";
import { rollups, spawn } from "@tuler/node-cartesi-machine";

const ANYONE = getAddress("0x0000000000000000000000000000000000000001");

describe("To Upper Tests", () => {
  const remoteMachine = spawn().load("src/01/.cartesi/image");
  const machine = rollups(remoteMachine, { noRollback: true });
  const baseTime = Math.floor(Date.now() / 1000);

  it("should convert lowercase to uppercase", () => {
    const input = "hello world";
    const payload: Hex = `0x${Buffer.from(input).toString("hex")}`;

    const { outputs } = machine.advance(
      encodeAdvanceInput({
        msgSender: ANYONE,
        blockTimestamp: BigInt(baseTime),
        payload,
      }),
      { collect: true }
    );

    expect(outputs.length).toBe(1);

    const expectedNotice = encodeNoticeOutput(stringToHex("HELLO WORLD"));
    expect(bytesToHex(outputs[0])).toBe(expectedNotice);
  });

  it("should handle mixed case input", () => {
    const input = "HeLLo WoRLd";
    const payload: Hex = `0x${Buffer.from(input).toString("hex")}`;

    const { outputs } = machine.advance(
      encodeAdvanceInput({
        msgSender: ANYONE,
        blockTimestamp: BigInt(baseTime + 1),
        payload,
      }),
      { collect: true }
    );

    expect(outputs.length).toBe(1);

    const expectedNotice = encodeNoticeOutput(stringToHex("HELLO WORLD"));
    expect(bytesToHex(outputs[0])).toBe(expectedNotice);
  });

  it("should handle already uppercase input", () => {
    const input = "ALREADY UPPERCASE";
    const payload: Hex = `0x${Buffer.from(input).toString("hex")}`;

    const { outputs } = machine.advance(
      encodeAdvanceInput({
        msgSender: ANYONE,
        blockTimestamp: BigInt(baseTime + 2),
        payload,
      }),
      { collect: true }
    );

    expect(outputs.length).toBe(1);

    const expectedNotice = encodeNoticeOutput(stringToHex("ALREADY UPPERCASE"));
    expect(bytesToHex(outputs[0])).toBe(expectedNotice);
  });

  it("should handle numbers and special characters", () => {
    const input = "test123!@#";
    const payload: Hex = `0x${Buffer.from(input).toString("hex")}`;

    const { outputs } = machine.advance(
      encodeAdvanceInput({
        msgSender: ANYONE,
        blockTimestamp: BigInt(baseTime + 3),
        payload,
      }),
      { collect: true }
    );

    expect(outputs.length).toBe(1);

    const expectedNotice = encodeNoticeOutput(stringToHex("TEST123!@#"));
    expect(bytesToHex(outputs[0])).toBe(expectedNotice);
  });

  afterAll(() => {
    machine.shutdown();
  });
});
