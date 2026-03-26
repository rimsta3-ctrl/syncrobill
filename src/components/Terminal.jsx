import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { parseEther } from "ethers";
import { getProvider, getContract, EXPECTED_CHAIN_ID } from "../utils/blockchain";
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
  const [withdrawId, setWithdrawId] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [pendingAction, setPendingAction] = useState("");
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
      setEscrowBalance(Number(balanceValue) / 1e18);
      setBlHash(hashValue || "");
      setMessage("Donnees du contrat mises a jour.");
    } catch (e) {
      setError("Impossible de lire l'etat du contrat");
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
      setError("Erreur lors de la lecture du solde ou reseau.");
      console.error(e);
    }
  };

  const connectWallet = async () => {
    try {
      setError("");
      if (!window.ethereum) {
        setError("MetaMask n'est pas installe");
        return;
      }

      const p = getProvider();
      if (!p) {
        setError("Impossible de creer le provider MetaMask");
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

      setMessage("Connecte avec succes.");
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
      setError("Entrez un montant de depot valide.");
      return;
    }

    setPendingAction("deposit");
    setError("");
    setMessage("Envoi de la transaction de depot...");

    try {
      const contract = getContract(signer);
      const ethValue = parseEther(depositAmount.toString());
      const tx = await contract.deposit(ethValue, { value: ethValue });
      await tx.wait();

      setMessage("Transaction de depot reussie.");
      setDepositAmount("");
      await refreshData();
      await updateBalanceAndNetwork(provider, signer);
    } catch (e) {
      console.error(e);
      setError("Erreur lors du depot.");
    } finally {
      setPendingAction("");
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

    setPendingAction("submitBL");
    setError("");
    setMessage("Envoi de la transaction de soumission du B/L...");

    try {
      const contract = getContract(signer);
      const tx = await contract.submitBL(blHashInput);
      await tx.wait();

      setMessage("Publication du B/L reussie.");
      setBlHashInput("");
      await refreshData();
    } catch (e) {
      console.error(e);
      setError("Erreur lors de l'envoi du B/L.");
    } finally {
      setPendingAction("");
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

    setPendingAction("withdraw");
    setError("");
    setMessage("Envoi de la transaction de retrait...");

    try {
      const contract = getContract(signer);
      const tx = await contract.withdraw(Number(withdrawId));
      await tx.wait();

      setMessage("Paiement recupere avec succes par l'exportateur.");
      await refreshData();
      await updateBalanceAndNetwork(provider, signer);
    } catch (e) {
      console.error(e);
      setError("Erreur lors du retrait. Verifiez que vous etes l'exportateur ou que le B/L est soumis.");
    } finally {
      setPendingAction("");
    }
  };

  useEffect(() => {
    if (window.ethereum) {
      // Connexion manuelle uniquement.
    }
  }, []);

  return (
    <div className="terminal">
      <button className="back-btn" onClick={() => navigate("/")}>
        &larr; RETOUR A L'ACCUEIL
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
          canWithdraw={
            status === 1 &&
            Number(escrowBalance) > 0 &&
            blHash.length > 0 &&
            withdrawId.trim().length > 0
          }
          pendingAction={pendingAction}
        />
      </div>
      <footer className="terminal-footer">
        {"R\u00e9seau : Hardhat Local | Contrat : 0x5FbDB...aa3"}
      </footer>
    </div>
  );
}

export default Terminal;
