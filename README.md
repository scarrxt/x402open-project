# x402-open paid download simulator

This project is a full, working simulator of a paid file/resource download service using the x402 protocol and x402-open. It includes:

- A backend that hosts paid files and a facilitator node (Base Sepolia).
- A one-click frontend that triggers payment and downloads the file.
- A buyer client script that pays and downloads from the CLI.

## What this project does

You can host PDFs (or any resource) and require payment before the file is unlocked. When a paid route is hit, the server enforces x402 payment verification and settlement, then delivers the file.

## Project layout

- [server.js](server.js): Express server, facilitator, paid routes.
- [buyer.js](buyer.js): CLI buyer that pays and downloads.
- [files](files): Paid resources (example PDF).
- [public](public): Frontend UI.
- [.env.example](.env.example): Required environment variables.

## Setup

1) Create a `.env` file using [.env.example](.env.example).
2) Install dependencies.
3) Start the server.

## Environment variables

- `PRIVATE_KEY`: EVM private key used by the facilitator to settle payments.
- `RECEIVER_WALLET`: Address that receives payments.

## Endpoints

- `GET /health` (free)
- `GET /files` (free list of paid resources)
- `GET /download/:id` (paid file download, protected by x402 middleware)
- `GET /purchase/:id` (server-side payment + download for the UI)
- `GET /` (frontend UI)
- Facilitator endpoints mounted at `/facilitator`:
  - `GET /facilitator/supported`
  - `POST /facilitator/verify`
  - `POST /facilitator/settle`

## How it works (end-to-end)

### Backend flow

1) The server starts a `Facilitator` configured for Base Sepolia.
2) The facilitator is mounted at `/facilitator` via `createExpressAdapter`.
3) `paymentMiddleware` protects paid routes like `/download/:id`.
4) A paid request triggers a 402 challenge unless the request includes a valid `X-PAYMENT` header.
5) Once payment is verified and settled, the file is returned.

### Frontend flow

The UI does a single click-to-download flow:

1) UI calls `GET /purchase/:id`.
2) The server performs the payment using `x402-fetch` with the wallet in `.env`.
3) On success, the server streams the file back to the browser.

This keeps the payment logic on the server and avoids exposing wallet keys in the browser.

### Buyer client flow

The CLI buyer uses `x402-fetch`:

1) Calls a paid URL (e.g., `/download/template-1`).
2) Automatically handles the 402 challenge.
3) Pays using the wallet in `.env`.
4) Downloads the file to [downloads](downloads).

## How x402 is used in this project

- `x402-open` provides the facilitator for verification and settlement.
- `x402-express` provides the payment middleware to protect routes.
- `x402-fetch` powers the buyer client and the server-side `/purchase/:id` flow.

When a request hits a protected route without payment proof, the server responds with HTTP 402 and payment requirements. The buyer (or server-side purchaser) then retries with a valid `X-PAYMENT` header, and the server releases the resource.

## Frontend and x402 visibility

You can see the 402 response in DevTools → Network by watching the `/purchase/:id` request. A failed attempt will show 402 with the x402 payload. A successful run returns the file content.

## Running the demo

1) Start the server.
2) Open `http://localhost:4021/`.
3) Click “Download.”

If your wallet is funded with Base Sepolia ETH and USDC, payment will succeed and the PDF will download.

## Adding more files

Add PDFs to [files](files) and register them in the `FILES` map in [server.js](server.js). Each entry can have its own price and network.

## Troubleshooting

- `Address "undefined" is invalid`: `.env` is missing `PRIVATE_KEY` or `RECEIVER_WALLET`.
- `insufficient_funds`: wallet does not have enough Base Sepolia ETH/USDC.
- Still getting 402 in the UI: the frontend uses `/purchase/:id` which pays server-side; verify `.env` and restart the server.# x402-open simulator

This is a simulator that:
- Runs a facilitator node (Base Sepolia).
- Protects `GET /weather` and a paid PDF download with x402 payment middleware.

## Setup
1) Copy `.env.example` to `.env` and fill values.
2) Install dependencies with your package manager.
3) Start the server.

## Endpoints
- `GET /health` (free)
- `GET /weather` (paid via X402)
- `GET /files` (free list of paid resources)
- `GET /download/template-1` (paid PDF download)
- `GET /purchase/template-1` (server-side payment + download)
- `GET /` (frontend UI)
- Facilitator endpoints mounted at `/facilitator`:
  - `GET /facilitator/supported`
  - `POST /facilitator/verify`
  - `POST /facilitator/settle`

## Notes
- `RECEIVER_WALLET` is the payment recipient.
- `PRIVATE_KEY` is used by the facilitator to settle on-chain.
- Base Sepolia is used for the example network.

## Buyer client
Run the buyer client after the server is up to complete the 402 payment flow and download the paid PDF.
Script: `buyer.js`.

## Frontend
Open `http://localhost:4021/` to view the UI and trigger downloads. The UI calls `/purchase/:id`, which performs the payment server-side and returns the file.
