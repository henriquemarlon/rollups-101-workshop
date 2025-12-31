import { getAddress, Hex, bytesToHex, stringToHex } from "viem";
import { afterAll, describe, expect, it } from "vitest";
import { encodeAdvanceInput, encodeNoticeOutput } from "../../../encoder";
import { rollups, spawn } from "@tuler/node-cartesi-machine";

const ANYONE = getAddress("0x0000000000000000000000000000000000000001");

describe("SQLite Tests", () => {
  const remoteMachine = spawn().load("src/02/.cartesi/image");
  const machine = rollups(remoteMachine, { noRollback: true });
  const baseTime = Math.floor(Date.now() / 1000);

  it("should create table, insert and select data", () => {
    const createSql = "CREATE TABLE users (id INTEGER PRIMARY KEY, name TEXT)";
    const createPayload: Hex = `0x${Buffer.from(createSql).toString("hex")}`;

    machine.advance(
      encodeAdvanceInput({
        msgSender: ANYONE,
        blockTimestamp: BigInt(baseTime),
        payload: createPayload,
      }),
      { collect: true }
    );

    const insertSql = "INSERT INTO users (id, name) VALUES (1, 'Alice')";
    const insertPayload: Hex = `0x${Buffer.from(insertSql).toString("hex")}`;

    machine.advance(
      encodeAdvanceInput({
        msgSender: ANYONE,
        blockTimestamp: BigInt(baseTime + 1),
        payload: insertPayload,
      }),
      { collect: true }
    );

    const selectSql = "SELECT * FROM users WHERE id = 1";
    const selectPayload: Hex = `0x${Buffer.from(selectSql).toString("hex")}`;

    const { outputs } = machine.advance(
      encodeAdvanceInput({
        msgSender: ANYONE,
        blockTimestamp: BigInt(baseTime + 2),
        payload: selectPayload,
      }),
      { collect: true }
    );

    expect(outputs.length).toBe(1);

    const expectedResult = '[[1, "Alice"]]';
    const expectedNotice = encodeNoticeOutput(stringToHex(expectedResult));
    expect(bytesToHex(outputs[0])).toBe(expectedNotice);
  });

  afterAll(() => {
    machine.shutdown();
  });
});
