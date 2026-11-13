// Payment reconciliation.
//
// Reads payments.jsonl and works out how much money we actually collected.
// Run:  node reconcile.js

const fs = require("fs");

// Amounts may be numbers or strings with thousands separators, e.g. "4,804.15".
function parseAmount(value) {
  if (typeof value === "number") return value;
  if (typeof value === "string") return Number(value.replace(/,/g, "").trim());
  return NaN;
}

// Keep only the latest attempt (by timestamp) for each txn_id.
const latest = new Map();

// File has CRLF line endings; split on either.
const lines = fs.readFileSync("payments.jsonl", "utf8").split(/\r?\n/);
for (const line of lines) {
  if (line.trim() === "") continue;

  let event;
  try {
    event = JSON.parse(line);
  } catch {
    continue; // Ignore lines that can't be read.
  }
  if (event === null || typeof event !== "object") continue;
  if (!event.txn_id) continue; // Ignore events without a txn_id.

  const ts = Date.parse(event.ts);
  const current = latest.get(event.txn_id);
  if (!current || ts > current.ts) {
    latest.set(event.txn_id, { ts, status: event.status, amount: parseAmount(event.amount) });
  }
}

let total = 0;
let count = 0;

for (const payment of latest.values()) {
  if (payment.status === "success") {
    total += payment.amount;
    count += 1;
  }
}

const expected = parseInt(fs.readFileSync("expected.txt", "utf8").trim(), 10);

if (count !== expected) {
  console.log(`Check failed: counted ${count} successful payments, expected ${expected}.`);
  console.log("Something in the data isn't being handled the way the README describes.");
} else {
  console.log(`Check passed: ${count} successful payments.`);
  console.log(`Your code: KOYA-${Math.round(total)}`);
}
