# Syncrobill

Syncrobill is a trade-finance dApp that combines a Sepolia escrow smart contract, a React/Vite frontend, MetaMask wallet flows, and optional Supabase storage for shipment documents and history.

## What the app does

- Importers create a shipment and lock funds in escrow on Sepolia.
- Exporters upload a bill of lading PDF, which is hashed in the browser with SHA-256.
- The B/L hash is submitted on-chain and the PDF can be stored in Supabase Storage.
- Exporters can withdraw funds when the shipment is locked and a B/L hash exists.
- Users can review shipment history in the terminal UI.
- The interface supports English, French, German, Italian, Spanish, and Arabic.

## Stack

- Frontend: React 18 + Vite + React Router
- Blockchain: Solidity + Hardhat + Ethers v6
- Wallet: MetaMask on Sepolia
- Storage and history: Supabase database + Supabase Storage
- UI helpers: Framer Motion, Lucide React

## Project structure

```text
contracts/            Solidity smart contract
scripts/deploy.js     Hardhat deployment script
src/App.jsx           App routes
src/components/       Landing page and transaction terminal UI
src/utils/blockchain.js
src/supabaseClient.js Frontend Supabase client
```

## Prerequisites

- Node.js 18 or newer
- npm
- MetaMask
- Sepolia ETH for test transactions
- A Supabase project if you want document upload and history persistence

## Environment variables

Create a local `.env` file in the project root with these values:

```bash
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
VITE_PRIVATE_KEY=your_wallet_private_key_for_hardhat_deployments
VITE_RPC_URL=your_sepolia_rpc_url
VITE_CONTRACT_ADDRESS=deployed_syncrobill_contract_address
VITE_BL_API_URL=http://localhost:8000/validate-bl
```

Notes:

- `VITE_CONTRACT_ADDRESS` is optional during early local development. The frontend falls back to Hardhat's default local deployment address if it is missing.
- The deployment script and network config read `VITE_PRIVATE_KEY` and `VITE_RPC_URL`.
- `.env` is already ignored by git and should stay private.

## Install

```bash
npm install --legacy-peer-deps
```

## Run the frontend

```bash
npm run dev
```

The app exposes two main routes:

- `/` for the landing page
- `/terminal` for wallet connection, shipment actions, and transaction history

## Deploy the smart contract

The Solidity contract lives in `contracts/syncrobill.sol` and the deployed contract name is `Syncrobil`.

Deploy to Sepolia with:

```bash
npx hardhat run scripts/deploy.js --network sepolia
```

After deployment:

1. Copy the deployed contract address from the terminal output.
2. Set `VITE_CONTRACT_ADDRESS` in `.env`.
3. Restart the Vite dev server if it is already running.

## Expected user flow

1. Connect MetaMask.
2. Switch or add the Sepolia network when prompted.
3. Enter the seller address and deposit amount.
4. Create a shipment and lock funds on-chain.
5. Upload a PDF bill of lading from the exporter section.
6. Let the app hash the file, upload it to Supabase, and submit the hash on-chain.
7. Withdraw escrowed funds for the shipment once the B/L has been submitted.

## Supabase expectations

When Supabase is configured, the frontend expects:

- A `shipments` table with fields used by the app:
  `blockchain_id`, `buyer`, `seller`, `amount`, `bl_hash`, `document_url`, `status`
- A Storage bucket named `documents`

If Supabase is not configured, blockchain actions can still work, but document upload and transaction history will not.

## Useful commands

```bash
npm run dev
npm run build
npm run preview
npx hardhat run scripts/deploy.js --network sepolia
```

## Current limitations

- `npm test` is not wired to a real test runner yet.
- The contract currently uses a simple escrow flow and does not include oracle-driven shipment verification.
- The terminal refresh focuses on the latest shipment state from the deployed contract.