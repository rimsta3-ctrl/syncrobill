# Syncrobill - Trade Finance Web3 Application

[![CI/CD](https://github.com/rimsta3-ctrl/syncrobill/actions/workflows/ci.yml/badge.svg)](https://github.com/rimsta3-ctrl/syncrobill/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

Syncrobill is a decentralized Trade Finance application built on Ethereum, featuring a Solidity smart contract escrow system and a luxurious React frontend. It enables secure payment escrow between Importers and Exporters, with digital Bill of Lading verification.

## 🌟 Features

- **Smart Contract Escrow**: Secure fund locking and release mechanism
- **Bill of Lading Verification**: SHA-256 hash-based document proof
- **MetaMask Integration**: Seamless wallet connection
- **Luxury UI**: Private banking-inspired design with gold accents
- **Real-time Updates**: Live contract state monitoring
- **Hardhat Testing**: Comprehensive smart contract tests

## 🏗️ Architecture

### Smart Contract (`contracts/syncrobill.sol`)
- **Solidity Version**: ^0.8.24
- **Network**: Hardhat Local (chainId: 31337)
- **Functions**:
  - `createShipment()`: Create escrow with seller and B/L hash
  - `submitBL()`: Submit Bill of Lading hash
  - `withdraw()`: Release funds to exporter (after B/L verification)

### Frontend (`src/`)
- **Framework**: React + Vite
- **Blockchain**: Ethers.js v6
- **Styling**: Custom CSS with luxury theme
- **Components**:
  - `WalletStatus`: MetaMask connection and balance display
  - `ContractInfo`: Shipment status and progress visualization
  - `ActionPanel`: Import/Export operations interface

## 🚀 Installation & Setup

### Prerequisites
- Node.js >= 18.0.0
- npm or yarn
- MetaMask browser extension
- Git

### 1. Clone the Repository
```bash
git clone https://github.com/rimsta3-ctrl/syncrobill.git
cd syncrobill
```

### 2. Install Dependencies
```bash
npm install --legacy-peer-deps
```

### 3. Start Hardhat Local Network
```bash
npx hardhat node
```
This starts a local Ethereum network on `http://127.0.0.1:8545`

### 4. Deploy Smart Contract
In a new terminal:
```bash
npx hardhat ignition deploy ./ignition/modules/Lock.js --network localhost
```
Note: Update contract address in `src/utils/blockchain.js` if needed.

### 5. Start Frontend Development Server
```bash
npm run dev
```
Open `http://localhost:5173` in your browser.

### 6. Connect MetaMask
- Connect to Hardhat Local Network (Chain ID: 31337)
- Import test accounts from Hardhat console output
- Start trading!

## 🧪 Testing

### Smart Contract Tests
```bash
npx hardhat test
```

### Frontend Tests (if added)
```bash
npm run test
```

### Gas Reporting
```bash
REPORT_GAS=true npx hardhat test
```

## 📋 Usage Workflow

1. **Importer**: Connect wallet → Deposit ETH → Create shipment
2. **Exporter**: Submit B/L hash → Wait for verification
3. **Importer**: Verify B/L → Release funds (or automatic via oracle)
4. **Exporter**: Withdraw released funds

## 🎨 Design Philosophy

Inspired by private banking and luxury finance platforms:
- **Color Palette**: Deep navy blues with gold accents
- **Typography**: Elegant fonts (Inter, Playfair Display)
- **Animations**: Subtle golden glow effects
- **Layout**: Centered, symmetrical, premium spacing

## 🔧 Configuration

### Environment Variables
Create `.env` file:
```env
HARDHAT_NETWORK_URL=http://127.0.0.1:8545
PRIVATE_KEY=your_private_key_here
```

### Contract Addresses
Update in `src/utils/blockchain.js`:
```javascript
export const CONTRACT_ADDRESS = "0xYourDeployedContractAddress";
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Commit changes: `git commit -m 'Add amazing feature'`
4. Push to branch: `git push origin feature/amazing-feature`
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- Hardhat for Ethereum development
- Ethers.js for blockchain interaction
- React & Vite for frontend framework
- OpenZeppelin for smart contract standards

## 📞 Support

For questions or issues:
- Open a GitHub Issue
- Check the [Hardhat Documentation](https://hardhat.org/docs)
- Review [Ethers.js Documentation](https://docs.ethers.org/)

---

**Built with ❤️ for secure, transparent trade finance.**
