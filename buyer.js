import "dotenv/config";
import { mkdir, writeFile } from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";
import { createWalletClient, http } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { baseSepolia } from "viem/chains";
import { wrapFetchWithPayment } from "x402-fetch";

const URL = "http://localhost:4021/download/template-1";

if (!process.env.PRIVATE_KEY) {
  console.error("Missing PRIVATE_KEY in .env");
  process.exit(1);
}

const account = privateKeyToAccount(process.env.PRIVATE_KEY);
const client = createWalletClient({
  account,
  transport: http(),
  chain: baseSepolia
});

const fetchWithPay = wrapFetchWithPayment(fetch, client);
const response = await fetchWithPay(URL, { method: "GET" });

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const outDir = path.join(__dirname, "downloads");
await mkdir(outDir, { recursive: true });

if (!response.ok) {
  const text = await response.text();
  console.error("Status:", response.status);
  console.error("Body:", text);
  process.exit(1);
}

const buffer = Buffer.from(await response.arrayBuffer());
const outPath = path.join(outDir, "template-1.pdf");
await writeFile(outPath, buffer);
console.log("Downloaded to:", outPath);
