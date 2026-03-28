import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import LandingPage from './components/LandingPage';
import Terminal from './components/Terminal';
import { LanguageProvider } from './i18n';
import { EXPECTED_CHAIN_ID_HEX, ensureSepoliaNetwork } from './utils/blockchain';
import './Prestige.css';
import contractABI from './abis/Syncrobil.json';
import { CONTRACT_ADDRESS } from './constants';


function App() {
  useEffect(() => {
    const resolvedContractABI = Array.isArray(contractABI?.abi) ? contractABI.abi : contractABI;

    if (!CONTRACT_ADDRESS || !Array.isArray(resolvedContractABI) || resolvedContractABI.length === 0) {
      console.warn('Syncrobill contract configuration is incomplete.');
    }

    const bootstrapMetaMask = async () => {
      if (!window.ethereum) return;

      try {
        const currentChainId = await window.ethereum.request({ method: 'eth_chainId' });

        if (currentChainId?.toLowerCase() !== EXPECTED_CHAIN_ID_HEX) {
          await ensureSepoliaNetwork();
        }
      } catch (error) {
        console.error('MetaMask bootstrap skipped:', error);
      }
    };

    bootstrapMetaMask();
  }, []);

  return (
    <LanguageProvider>
      <Router>
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/terminal" element={<Terminal />} />
        </Routes>
      </Router>
    </LanguageProvider>
  );
}

export default App;
