import { rollups, spawn, Reg } from "@tuler/node-cartesi-machine";
import { getAddress, Hex } from "viem";
import { encodeAdvanceInput } from "./encoder";
import { writeFileSync, mkdirSync } from "fs";

interface BenchmarkResult {
  operation: string;
  mcycle: {
    before: bigint;
    after: bigint;
    diff: bigint;
  };
  instret: {
    before: bigint;
    after: bigint;
    diff: bigint;
  };
}

const benchmarkResults: {
  timestamp: string;
  operations: BenchmarkResult[];
} = {
  timestamp: new Date().toISOString(),
  operations: [],
};

const ANYONE = getAddress(
  "0x0000000000000000000000000000000000000001",
);

const processInput = (
  machine: any,
  input: Buffer,
  description: string,
): any => {
  console.log(`\n=== ${description} ===`);
  const result = machine.advance(input, { collect: true });

  for (const output of result.outputs || []) {
    const hexOutput = "0x" + Buffer.from(output).toString("hex");
    console.log("Output:", hexOutput);
  }

  for (const report of result.reports || []) {
    const reportStr = Buffer.from(report).toString("utf-8");
    console.log("Report:", reportStr);
  }

  return result;
};

const measureOperation = (
  remoteMachine: any,
  machine: any,
  sqlStatement: string,
  operationName: string,
  timestamp: bigint,
): BenchmarkResult => {
  const result: BenchmarkResult = {
    operation: operationName,
    mcycle: { before: 0n, after: 0n, diff: 0n },
    instret: { before: 0n, after: 0n, diff: 0n },
  };

  result.mcycle.before = BigInt(remoteMachine.readReg(Reg.Mcycle));
  result.instret.before = BigInt(remoteMachine.readReg(Reg.Icycleinstret));

  console.log(`\n=== Before ${operationName} ===`);
  console.log(`Mcycle: ${result.mcycle.before}`);
  console.log(`Instret: ${result.instret.before}`);

  const payload: Hex = `0x${Buffer.from(sqlStatement).toString("hex")}`;

  processInput(
    machine,
    encodeAdvanceInput({
      msgSender: ANYONE,
      blockTimestamp: timestamp,
      payload,
    }),
    operationName,
  );

  result.mcycle.after = BigInt(remoteMachine.readReg(Reg.Mcycle));
  result.instret.after = BigInt(remoteMachine.readReg(Reg.Icycleinstret));

  console.log(`\n=== After ${operationName} ===`);
  console.log(`Mcycle: ${result.mcycle.after}`);
  console.log(`Instret: ${result.instret.after}`);

  result.mcycle.diff = result.mcycle.after - result.mcycle.before;
  result.instret.diff = result.instret.after - result.instret.before;

  console.log(`\n=== ${operationName} Results ===`);
  console.log(`Machine Cycles (Mcycle): ${result.mcycle.diff}`);
  console.log(`Instructions Retired (Instret): ${result.instret.diff}`);

  return result;
};

const remoteMachine = spawn().load("src/02/.cartesi/image");
const machine = rollups(remoteMachine, { noRollback: true });

const baseTime = Math.floor(Date.now() / 1000);

// Gera endereços para batch insert
const generateMockData = (count: number, startIndex: number): string => {
  const values = [];
  for (let i = 0; i < count; i++) {
    const addr = `0x${(startIndex + i).toString(16).padStart(40, "0")}`;
    const amount = Math.floor(Math.random() * 1000000) + 1000;
    values.push(`('${addr}', ${amount})`);
  }
  return values.join(", ");
};

const sqlOperations = [
  {
    name: "CREATE TABLE balances",
    query: "CREATE TABLE IF NOT EXISTS balances (address TEXT PRIMARY KEY, amount INTEGER NOT NULL DEFAULT 0)",
  },
  {
    name: "BATCH INSERT 10 holders",
    query: `INSERT INTO balances (address, amount) VALUES ${generateMockData(10, 1)}`,
  },
  {
    name: "BATCH INSERT 50 holders",
    query: `INSERT INTO balances (address, amount) VALUES ${generateMockData(50, 100)}`,
  },
  {
    name: "BATCH INSERT 100 holders",
    query: `INSERT INTO balances (address, amount) VALUES ${generateMockData(100, 200)}`,
  },
  {
    name: "BATCH INSERT 500 holders",
    query: `INSERT INTO balances (address, amount) VALUES ${generateMockData(500, 500)}`,
  },
  {
    name: "SELECT COUNT all",
    query: "SELECT COUNT(*) FROM balances",
  },
  {
    name: "SUM all balances",
    query: "SELECT SUM(amount) as total_supply FROM balances",
  },
  {
    name: "TOP 100 HOLDERS",
    query: "SELECT address, amount FROM balances ORDER BY amount DESC LIMIT 100",
  },
  {
    name: "UPDATE all +10%",
    query: "UPDATE balances SET amount = amount * 1.1",
  },
  {
    name: "SELECT WHERE amount>5000",
    query: "SELECT COUNT(*) FROM balances WHERE amount > 5000",
  },
];

console.log("\n========================================");
console.log("SQLite Benchmark - Cartesi Machine");
console.log("========================================\n");

for (let i = 0; i < sqlOperations.length; i++) {
  const operation = sqlOperations[i];
  const result = measureOperation(
    remoteMachine,
    machine,
    operation.query,
    operation.name,
    BigInt(baseTime + i),
  );
  benchmarkResults.operations.push(result);
}

console.log("\n========================================");
console.log("BENCHMARK SUMMARY");
console.log("========================================\n");

console.log(
  "Operation                    | Mcycle Diff      | Instret Diff",
);
console.log("-".repeat(66));

for (const op of benchmarkResults.operations) {
  const name = op.operation.padEnd(28);
  const mcycle = op.mcycle.diff.toString().padStart(16);
  const instret = op.instret.diff.toString().padStart(16);
  console.log(`${name} | ${mcycle} | ${instret}`);
}

mkdirSync("src/02/perf/results", { recursive: true });

const outputPath = "src/02/perf/results/sqlite.json";
const output = {
  timestamp: benchmarkResults.timestamp,
  operations: benchmarkResults.operations.map((op) => ({
    operation: op.operation,
    mcycles: op.mcycle.diff.toString(),
    instret: op.instret.diff.toString(),
  })),
  summary: {
    totalOperations: benchmarkResults.operations.length,
    totalMcycles: benchmarkResults.operations
      .reduce((sum, op) => sum + op.mcycle.diff, 0n)
      .toString(),
    totalInstret: benchmarkResults.operations
      .reduce((sum, op) => sum + op.instret.diff, 0n)
      .toString(),
  },
};

writeFileSync(outputPath, JSON.stringify(output, null, 2));
console.log(`\nResults saved to: ${outputPath}`);

machine.shutdown();