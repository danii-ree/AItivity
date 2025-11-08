// clone_key.js
// Node 18+ recommended (or run with --experimental-modules if using older Node).
import 'dotenv/config'; // Automatically loads .env
import OpenAI from "openai";
import process from "process";

function maskKey(k, keep = 6) {
  if (!k) return "*****";
  if (k.length <= keep + 4) return k[0] + "...";
  return k.slice(0, keep) + "..." + k.slice(-4);
}

async function main() {
  // 1) Read key from environment
  const key = process.env.OPENAI_API_KEY;
  if (!key) {
    console.error("ERROR: OPENAI_API_KEY not found in environment.");
    process.exit(1);
  }

  // 2) "Clone" it in-memory and into a process-only env var
  const clonedKey = key; // in-process clone (no persistence)
  process.env.MY_APP_OPENAI_KEY = clonedKey; // process-only

  // 3) Safe masked output
  console.log("Original (masked):", maskKey(key));
  console.log("Cloned   (masked):", maskKey(clonedKey));
  console.log("Stored in process env as MY_APP_OPENAI_KEY (process-only).");

  // 4) Example usage with official OpenAI JS client
  try {
    const client = new OpenAI({ apiKey: clonedKey });
    // harmless example: list models
    const models = await client.models.list();
    console.log("Got", models.data?.length ?? 0, "models.");
  } catch (err) {
    console.error("OpenAI client call failed (maybe invalid key or network):", err?.message ?? err);
  }
}

main();