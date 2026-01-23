import "dotenv/config";
import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import { paymentMiddleware } from "x402-express";
import { Facilitator, createExpressAdapter } from "x402-open";
import { createWalletClient, http } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { baseSepolia } from "viem/chains";
import { wrapFetchWithPayment } from "x402-fetch";

const app = express();
app.use(express.json());

const requiredEnv = ["PRIVATE_KEY", "RECEIVER_WALLET"];
const missingEnv = requiredEnv.filter((key) => !process.env[key]);
if (missingEnv.length) {
  console.error(
    `Missing required environment variables: ${missingEnv.join(", ")}. ` +
      "Create a .env file based on .env.example and restart the server."
  );
  process.exit(1);
}

const facilitator = new Facilitator({
  evmPrivateKey: process.env.PRIVATE_KEY,
  evmNetworks: [baseSepolia]
});

createExpressAdapter(facilitator, app, "/facilitator");

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const filesDir = path.join(__dirname, "files");
const publicDir = path.join(__dirname, "public");

const account = privateKeyToAccount(process.env.PRIVATE_KEY);
const walletClient = createWalletClient({
  account,
  transport: http(),
  chain: baseSepolia
});
const fetchWithPay = wrapFetchWithPayment(fetch, walletClient);

const FILES = {
  "template-1": {
    filename: "template-1.pdf",
    path: path.join(filesDir, "template-1.pdf"),
    price: "$0.001",
    network: "base-sepolia",
    contentType: "application/pdf"
  }
};

const paidRoutes = Object.entries(FILES).reduce((acc, [id, meta]) => {
  acc[`GET /download/${id}`] = { price: meta.price, network: meta.network };
  return acc;
}, {
  "GET /weather": { price: "$0.0001", network: "base-sepolia" }
});

app.use(
  paymentMiddleware(process.env.RECEIVER_WALLET, paidRoutes, {
    url: "http://localhost:4021/facilitator"
  })
);

app.get("/weather", (_req, res) => {
  res.json({ report: { weather: "sunny", temperature: 70 } });
});

app.get("/files", (_req, res) => {
  const list = Object.entries(FILES).map(([id, meta]) => ({
    id,
    filename: meta.filename,
    price: meta.price,
    network: meta.network,
    downloadUrl: `/download/${id}`,
    purchaseUrl: `/purchase/${id}`
  }));

  res.json({ files: list });
});

app.get("/download/:id", (req, res) => {
  const meta = FILES[req.params.id];
  if (!meta) {
    res.status(404).json({ error: "File not found" });
    return;
  }

  res.setHeader("Content-Type", meta.contentType);
  res.download(meta.path, meta.filename);
});

app.get("/purchase/:id", async (req, res) => {
  const meta = FILES[req.params.id];
  if (!meta) {
    res.status(404).json({ error: "File not found" });
    return;
  }

  try {
    const url = `http://localhost:4021/download/${req.params.id}`;
    const response = await fetchWithPay(url, { method: "GET" });

    if (!response.ok) {
      const text = await response.text();
      res.status(response.status).send(text);
      return;
    }

    const buffer = Buffer.from(await response.arrayBuffer());
    res.setHeader("Content-Type", meta.contentType);
    res.setHeader("Content-Disposition", `attachment; filename=\"${meta.filename}\"`);
    res.send(buffer);
  } catch (error) {
    res.status(500).json({ error: error?.message ?? "Purchase failed" });
  }
});

app.get("/health", (_req, res) => {
  res.json({ ok: true });
});

app.use(express.static(publicDir));

const port = 4021;
app.listen(port, () => {
  console.log(`Server on http://localhost:${port}`);
  console.log("Facilitator at http://localhost:4021/facilitator");
});
