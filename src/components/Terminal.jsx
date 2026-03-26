import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { BrowserProvider, parseEther } from "ethers";
import { getProvider, getContract, EXPECTED_CHAIN_ID, CONTRACT_ADDRESS } from "../utils/blockchain";
import WalletStatus from "./WalletStatus";
import ContractInfo from "./ContractInfo";
import ActionPanel from "./ActionPanel";

function Terminal() {
  const navigate = useNavigate();
  const [account, setAccount] = useState("");
  const [balance, setBalance] = useState("0");
  const [networkOk, setNetworkOk] = useState(false);
  const [status, setStatus] = useState(0);
  const [escrowBalance, setEscrowBalance] = useState("0");
  const [blHash, setBlHash] = useState("");
  const [depositAmount, setDepositAmount] = useState("");
  const [blHashInput, setBlHashInput] = useState("");
  const [withdrawId, setWithdrawId] = useState("1");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [isPending, setIsPending] = useState(false);
  const [loadingContract, setLoadingContract] = useState(false);

  const [provider, setProvider] = useState(null);
  const [signer, setSigner] = useState(null);

  const refreshData = async (providerToUse) => {
    try {
      setLoadingContract(true);
      const providerSafe = providerToUse || provider;
      if (!providerSafe) return;

      const contract = getContract(providerSafe);
      const statusValue = await contract.status();
      const balanceValue = await contract.escrowBalance();
      const hashValue = await contract.blHash();

      setStatus(Number(statusValue));
      setEscrowBalance(Number(balanceValue) / 1e18); // display in ETH
      setBlHash(hashValue || "");
      setMessage("Données du contrat mises à jour.");
    } catch (e) {
      setError("Impossible de lire l'état du contrat");
      console.error(e);
    } finally {
      setLoadingContract(false);
    }
  };

  const updateBalanceAndNetwork = async (p, signerToUse) => {
    try {
      const network = await p.getNetwork();
      setNetworkOk(network.chainId === EXPECTED_CHAIN_ID);

      if (signerToUse) {
        const address = await signerToUse.getAddress();
        setAccount(address);
        const balanceBn = await p.getBalance(address);
        setBalance(parseFloat(balanceBn.toString() / 1e18).toFixed(4));
      }
    } catch (e) {
      setError("Erreur lors de la lecture du solde ou réseau.");
      console.error(e);
    }
  };

  const connectWallet = async () => {
    try {
      setError("");
      if (!window.ethereum) {
        setError("MetaMask n'est pas installé");
        return;
      }

      const p = getProvider();
      if (!p) {
        setError("Impossible de créer le provider MetaMask");
        return;
      }

      await p.send("eth_requestAccounts", []);
      const signerInstance = await p.getSigner();

      setProvider(p);
      setSigner(signerInstance);

      await updateBalanceAndNetwork(p, signerInstance);
      await refreshData(p);

      window.ethereum.on("accountsChanged", async (accounts) => {
        if (accounts.length === 0) {
          setAccount("");
          setBalance("0");
          return;
        }
        await updateBalanceAndNetwork(p, signerInstance);
      });

      window.ethereum.on("chainChanged", async () => {
        await updateBalanceAndNetwork(p, signerInstance);
        await refreshData(p);
      });

      setMessage("Connecté avec succès.");
    } catch (e) {
      console.error(e);
      setError("Erreur de connexion au portefeuille.");
    }
  };

  const onDeposit = async () => {
    if (!signer) {
      setError("Connectez votre portefeuille d'abord.");
      return;
    }

    if (!depositAmount || Number(depositAmount) <= 0) {
      setError("Entrez un montant de dépôt valide.");
      return;
    }

    setIsPending(true);
    setError("");
    setMessage("Envoi de la transaction de dépôt...");

    try {
      const contract = getContract(signer);
      const ethValue = parseEther(depositAmount.toString());
      const tx = await contract.deposit(ethValue, { value: ethValue });
      await tx.wait();

      setMessage("Transaction de dépôt réussie !");
      setDepositAmount("");
      await refreshData();
      await updateBalanceAndNetwork(provider, signer);
    } catch (e) {
      console.error(e);
      setError("Erreur lors du dépôt.");
    } finally {
      setIsPending(false);
    }
  };

  const onSubmitBL = async () => {
    if (!signer) {
      setError("Connectez votre portefeuille d'abord.");
      return;
    }

    if (!blHashInput) {
      setError("Entrez un hash B/L valide.");
      return;
    }

    setIsPending(true);
    setError("");
    setMessage("Envoi de la transaction de soumission du B/L...");

    try {
      const contract = getContract(signer);
      const tx = await contract.submitBL(blHashInput);
      await tx.wait();

      setMessage("Publication du B/L réussie !");
      setBlHashInput("");
      await refreshData();
    } catch (e) {
      console.error(e);
      setError("Erreur lors de l'envoi du B/L.");
    } finally {
      setIsPending(false);
    }
  };

  const onWithdraw = async () => {
    if (!signer) {
      setError("Connectez votre portefeuille d'abord.");
      return;
    }

    if (!withdrawId || Number(withdrawId) < 1) {
      setError("Entrez un ID de shipment valide pour retrait.");
      return;
    }

    setIsPending(true);
    setError("");
    setMessage("Envoi de la transaction de retrait...");

    try {
      const contract = getContract(signer);
      const tx = await contract.withdraw(Number(withdrawId));
      await tx.wait();

      setMessage("Paiement récupéré avec succès par l'exportateur !");
      await refreshData();
      await updateBalanceAndNetwork(provider, signer);
    } catch (e) {
      console.error(e);
      setError("Erreur lors du retrait. Vérifiez que vous êtes l'exportateur ou que le B/L est soumis.");
    } finally {
      setIsPending(false);
    }
  };

  useEffect(() => {
    if (window.ethereum) {
      // connexion automatique possible, mais on attend le clic.
    }
  }, []);

  return (
    <div className="terminal">
      <button 
        className="back-btn" 
        onClick={() => navigate('/')}
      >
        RETOUR À L'ACCUEIL
      </button>
      <h2>Terminal de Transaction Syncrobill</h2>
      <div className="app-container">
        <div className="message-bar">
          {message && <span className="success">{message}</span>}
          {error && <span className="error">{error}</span>}
        </div>

        <WalletStatus
          address={account}
          balance={balance}
          networkOk={networkOk}
          onConnect={connectWallet}
          error={error}
        />

        <ContractInfo
          status={status}
          escrowBalance={escrowBalance}
          blHash={blHash}
          loading={loadingContract}
        />

        <ActionPanel
          depositAmount={depositAmount}
          setDepositAmount={setDepositAmount}
          blHashInput={blHashInput}
          setBlHashInput={setBlHashInput}
          withdrawId={withdrawId}
          setWithdrawId={setWithdrawId}
          onDeposit={onDeposit}
          onSubmitBL={onSubmitBL}
          onWithdraw={onWithdraw}
          canWithdraw={status === 1 && Number(escrowBalance) > 0 && blHash.length > 0}
          isPending={isPending}
        />
      </div>
      <footer className="terminal-footer">
        Réseau : Hardhat Local (31337) | Contrat : {CONTRACT_ADDRESS}
      </footer>
    </div>
  );
}

export default Terminal;