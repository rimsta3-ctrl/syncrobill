Syncrobill
Syncrobill is a trade-finance dApp that simulates a Letter of Credit flow on Ethereum. An importer locks funds in escrow on Sepolia, an exporter uploads a Bill of Lading PDF that is validated by an AI backend and hashed on-chain, and funds are released once the document is verified.
What the app does

Importers create a shipment and lock ETH in escrow on Sepolia.
Exporters upload a Bill of Lading PDF. The backend validates its content (required keywords + amount match) and signs the SHA-256 hash with a server key.
The signed hash is submitted on-chain. The contract verifies the server signature before accepting it.
Exporters can withdraw escrowed funds once the B/L is validated.
All shipments are mirrored to Supabase for history and document storage.
The interface supports English, French, German, Italian, Spanish, and Arabic.

Stack

Frontend: React 18 + Vite + React Router
Blockchain: Solidity 0.8.24 + Hardhat + Ethers v6
Wallet: MetaMask on Sepolia testnet
AI validation backend: Python + FastAPI + PyPDF2 + eth_account
Storage and history: Supabase database + Supabase Storage
UI helpers: Framer Motion, Lucide React

Project structure
textcontracts/
  syncrobill.sol          Escrow smart contract with B/L validation
scripts/
  deploy.js               Hardhat deployment script (reads .env.deploy)
backend/
  main.py                 FastAPI B/L validation service
src/
  App.jsx                 App routes
  constants.js            Contract address + ABI resolver
  supabaseClient.js       Supabase client (null-safe if unconfigured)
  hooks/
    useWallet.js          MetaMask connection, balance, network
    useShipment.js        On-chain shipment logic (deposit, submitBL, withdraw)
    useSupabase.js        Database reads and writes
  components/
    Terminal.jsx          Main dApp UI
    ActionPanel.jsx       Deposit / B/L upload / withdraw forms
    ContractInfo.jsx      Current shipment state display
    WalletStatus.jsx      Wallet connection status
    LandingPage.jsx       Landing route
    Navbar.jsx
  utils/
    blockchain.js         Provider, contract, network helpers
  i18n.jsx                Translations (en, fr, de, it, es, ar)
  abis/
    Syncrobil.json        Contract ABI
generate_address.py       Derives the public address from a private key
Prerequisites

Node.js 18 or newer and npm
Python 3.10 or newer and pip
MetaMask browser extension
Sepolia ETH (free from a faucet)
A Supabase project (optional — blockchain actions work without it, but history and document storage will not)

Environment variables
This project uses two separate .env files to keep deployment secrets away from the browser bundle.
.env — frontend only (safe to have VITE_ prefix)
bashVITE_CONTRACT_ADDRESS=deployed_syncrobill_contract_address
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
VITE_BL_API_URL=http://localhost:8000/validate-bl
VITE_CONTRACT_ADDRESS is optional during local development — the frontend falls back to a hardcoded Sepolia address. All VITE_* variables are injected into the browser bundle by Vite, so never put private keys here.
.env.deploy — Hardhat scripts only (never read by Vite)
bash# Wallet that pays gas for deployment
DEPLOY_PRIVATE_KEY=your_deployer_wallet_private_key

# Sepolia RPC endpoint (Infura, Alchemy, Ankr, etc.)
DEPLOY_RPC_URL=https://sepolia.infura.io/v3/your_project_id

# Public address matching SYNCROBILL_SIGNER_PRIVATE_KEY in the backend
# Run: python generate_address.py  to get this value
DEPLOY_SERVER_SIGNER=0x...
Backend .env — FastAPI service
bashSYNCROBILL_SIGNER_PRIVATE_KEY=your_server_signing_private_key
Both .env and .env.deploy are git-ignored and should never be committed.
Install
bash# Node dependencies
npm install --legacy-peer-deps

# Python dependencies
pip install -r requirements.txt
Run the frontend
bashnpm run dev
Routes:

/ — landing page
/terminal — wallet connection, shipment actions, transaction history

Run the backend
The B/L validation service must be running for document submission to work.
bashcd backend
uvicorn main:app --reload
The service listens on http://localhost:8000 by default. The frontend reads its URL from VITE_BL_API_URL.
To confirm the signing key is correctly configured before deploying:
bashpython generate_address.py
This prints the public address derived from SYNCROBILL_SIGNER_PRIVATE_KEY. Copy it into DEPLOY_SERVER_SIGNER in .env.deploy.
Deploy the smart contract
The contract constructor takes the server signer address as a parameter. This means the AI validation key is configurable at deploy time and can be rotated later without redeployment.
bashnpx hardhat run scripts/deploy.js --network sepolia
The script reads DEPLOY_SERVER_SIGNER from .env.deploy and passes it to the constructor automatically. After deployment:

Copy the printed contract address.
Set VITE_CONTRACT_ADDRESS in .env.
Restart the Vite dev server if it is already running.

To rotate the server signing key after deployment (no redeployment needed):
solidity// Call from the owner wallet
syncrobil.setServerSigner(newSignerAddress);
Supabase setup
When Supabase is configured, the app expects:

A shipments table with columns: blockchain_id, buyer, seller, amount, bl_hash, document_url, status
A Storage bucket named documents with public read access

If Supabase is not configured (env vars missing), the client is set to null and all database calls are silently skipped. Blockchain actions still work.
Expected user flow

Connect MetaMask and switch to Sepolia when prompted.
(Importer) Enter the seller address and ETH amount, then click Deposit Funds. This calls createShipment on-chain and records the shipment in Supabase.
(Exporter) Upload a Bill of Lading PDF. The app sends it to the FastAPI backend, which checks for required keywords (Bill of Lading, Shipper, Consignee) and verifies the amount matches the escrowed value.
If valid, the backend returns a signed SHA-256 hash. The app calls submitBL on-chain with the hash and signature. The contract verifies the signature against serverSigner.
(Exporter) Click Confirm Withdrawal. This calls withdraw, which checks isValidatedByAI before transferring funds.

Useful commands
bashnpm run dev                                          # Start frontend
npm run build                                        # Production build
uvicorn backend.main:app --reload                    # Start validation backend
npx hardhat run scripts/deploy.js --network sepolia  # Deploy contract
python generate_address.py                           # Verify signing key
Current limitations

npm test is not wired to a real test runner. The contract has no test suite yet — the test/ folder contains Hardhat boilerplate for a different contract.
B/L validation is keyword-based and amount-matching only. There is no semantic document understanding or OCR for scanned PDFs.
The terminal displays the state of one shipment at a time (the latest). Switching between past shipments requires manual ID input.
The app requires MetaMask. WalletConnect and other providers are not supported.