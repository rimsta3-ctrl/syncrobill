# Syncrobill

Syncrobill is a multilingual trade-finance dApp that combines a React frontend, a Hardhat smart-contract workspace, and Supabase for document storage plus transaction persistence.

The platform is designed around a shipment escrow workflow:

- the importer creates a shipment and locks funds on-chain
- the exporter uploads a Bill of Lading PDF
- the app computes the PDF SHA-256 hash automatically
- the hash is sent to the contract as blockchain proof
- the PDF is stored in Supabase Storage and linked in the dashboard
- the transaction history is synced in Supabase for operational tracking

## Current Stack

- Frontend: React + Vite
- Blockchain: Hardhat + ethers.js
- Network target: Sepolia
- Database and storage: Supabase
- Routing: react-router-dom
- UI extras: lucide-react, framer-motion
- Internationalization: custom i18n layer with RTL support for Arabic

## Core Features

- Shipment creation and escrow funding from the dashboard
- Automatic B/L PDF hashing with SHA-256 before blockchain submission
- Supabase Storage upload to the `documents` bucket
- Public document links rendered directly in the transaction history
- Supabase transaction sync with `blockchain_id`, `buyer`, `seller`, `amount`, `bl_hash`, `document_url`, and `status`
- Wallet-aware dashboard filtering so connected users only see their own transactions
- Priority badges such as `Action required` and `Ready for withdrawal`
- Toast feedback for blockchain, storage, and database sync steps
- English default UI with French, German, Italian, Spanish, and Arabic translations

## Project Structure

```text
syncrobill/
|- contracts/
|  |- syncrobill.sol
|- scripts/
|  |- deploy.js
|- src/
|  |- components/
|  |  |- ActionPanel.jsx
|  |  |- ContractInfo.jsx
|  |  |- LandingPage.jsx
|  |  |- Navbar.jsx
|  |  |- Terminal.jsx
|  |  |- WalletStatus.jsx
|  |- supabaseClient.js
|  |- i18n.jsx
|  |- utils/blockchain.js
|- hardhat.config.cjs
|- package.json
```

## Environment Variables

Create a local `.env` file with the values needed by the frontend and Hardhat:

```env
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
VITE_RPC_URL=your_sepolia_rpc_url
VITE_PRIVATE_KEY=your_wallet_private_key
VITE_CONTRACT_ADDRESS=your_deployed_contract_address
```

Notes:

- `VITE_RPC_URL` is used by Hardhat for the `sepolia` network configuration.
- `VITE_PRIVATE_KEY` is optional in the Hardhat config; if it is missing, the accounts array falls back to `[]`.
- `VITE_CONTRACT_ADDRESS` is used by the frontend when interacting with the deployed contract.
- Do not commit real private keys or secret credentials.

## Supabase Requirements

The app expects:

- a public Storage bucket named `documents`
- a `shipments` table containing at least:
  - `blockchain_id`
  - `buyer`
  - `seller`
  - `amount`
  - `bl_hash`
  - `document_url`
  - `status`

## Smart Contract Flow

The current frontend workflow assumes the contract supports:

- shipment creation with locked escrow funds
- B/L hash submission
- withdrawal and release state updates

The frontend reads the latest shipment state to populate:

- current shipment overview
- escrow balance
- B/L submission state
- withdrawal readiness

## Local Development

Install dependencies:

```bash
npm install
```

Start the frontend:

```bash
npm run dev
```

## Deploy to Sepolia

Compile:

```bash
npx hardhat compile
```

Deploy:

```bash
npx hardhat run scripts/deploy.js --network sepolia
```

The deploy script prints:

```text
CONTRAT DEPLOYE A L'ADRESSE : <address>
```

After deployment, copy the deployed address into `VITE_CONTRACT_ADDRESS`.

## UI Notes

- The terminal includes blockchain, storage, and database progress toasts.
- If MetaMask is not connected to Sepolia, the app shows a network warning.
- Arabic switches the application into RTL mode, including dashboard alignment and layout direction.

## Status

This repository is no longer a generic Hardhat sample. It is the working codebase for the current Syncrobill product prototype, including on-chain escrow actions, multilingual UI, document upload, and Supabase-backed transaction operations.
