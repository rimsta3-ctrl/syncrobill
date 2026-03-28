import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { formatEther, isAddress, parseEther } from "ethers";
import { ExternalLink, FileText } from "lucide-react";
import {
  CONTRACT_ADDRESS,
  getProvider,
  getContract,
  EXPECTED_CHAIN_ID,
  ensureSepoliaNetwork,
} from "../utils/blockchain";
import { supabase } from "../supabaseClient";
import { useTranslation } from "../i18n";
import WalletStatus from "./WalletStatus";
import ContractInfo from "./ContractInfo";
import ActionPanel from "./ActionPanel";
import Navbar from "./Navbar";

const formatWallet = (value = "") =>
  value ? `${value.slice(0, 6)}...${value.slice(-4)}` : "-";

const normalizeAddress = (value = "") => value.toLowerCase();
const contractExplorerUrl = `https://sepolia.etherscan.io/address/${CONTRACT_ADDRESS}`;

function getReadableError(error, fallback) {
  if (error?.message?.includes("could not coalesce error")) {
    return fallback;
  }

  return (
    error?.shortMessage ||
    error?.reason ||
    error?.info?.error?.message ||
    error?.message ||
    fallback
  );
}

function Terminal() {
  const navigate = useNavigate();
  const { t, i18n } = useTranslation();
  const [account, setAccount] = useState("");
  const [balance, setBalance] = useState("0");
  const [networkOk, setNetworkOk] = useState(false);
  const [currentShipmentId, setCurrentShipmentId] = useState("");
  const [status, setStatus] = useState(0);
  const [escrowBalance, setEscrowBalance] = useState("0");
  const [blHash, setBlHash] = useState("");
  const [sellerAddress, setSellerAddress] = useState("");
  const [depositAmount, setDepositAmount] = useState("");
  const [blFile, setBlFile] = useState(null);
  const [withdrawId, setWithdrawId] = useState("");
  const [transactions, setTransactions] = useState([]);
  const [loadingTransactions, setLoadingTransactions] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [toasts, setToasts] = useState([]);
  const [pendingAction, setPendingAction] = useState("");
  const [loadingContract, setLoadingContract] = useState(false);
  const [provider, setProvider] = useState(null);
  const [signer, setSigner] = useState(null);

  const addToast = (type, text) => {
    const id = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    setToasts((current) => [...current, { id, type, text }].slice(-4));
    window.setTimeout(() => {
      setToasts((current) => current.filter((toast) => toast.id !== id));
    }, 4500);
  };

  const getPriority = (transaction) => {
    if (transaction.status === "Released") {
      return t("terminal.priority.none");
    }

    if (!transaction.bl_hash) {
      return t("terminal.priority.actionRequired");
    }

    return t("terminal.priority.readyForWithdrawal");
  };

  const fetchTransactions = async () => {
    if (!supabase || !account) {
      setTransactions([]);
      return;
    }

    try {
      setLoadingTransactions(true);
      const { data, error: fetchError } = await supabase
        .from("shipments")
        .select("blockchain_id, buyer, seller, amount, bl_hash, document_url, status")
        .or(`buyer.eq.${account},seller.eq.${account}`)
        .order("blockchain_id", { ascending: false });

      if (fetchError) {
        throw fetchError;
      }

      const normalizedAccount = normalizeAddress(account);
      setTransactions(
        (data || []).filter((item) => {
          const buyer = normalizeAddress(item.buyer || "");
          const seller = normalizeAddress(item.seller || "");
          return buyer === normalizedAccount || seller === normalizedAccount;
        })
      );
    } catch (fetchTransactionsError) {
      console.error(fetchTransactionsError);
      const readableError = getReadableError(fetchTransactionsError, t("terminal.errors.historyLoad"));
      setError(readableError);
      addToast("error", readableError);
    } finally {
      setLoadingTransactions(false);
    }
  };

  const refreshData = async (providerToUse) => {
    try {
      setLoadingContract(true);
      const providerSafe = providerToUse || provider;
      const signerSafe = signer;

      if (!providerSafe || !signerSafe) {
        setCurrentShipmentId("");
        setStatus(0);
        setEscrowBalance("0");
        setBlHash("");
        return;
      }

      const contract = getContract(providerSafe);
      if (!contract) {
        setCurrentShipmentId("");
        setStatus(0);
        setEscrowBalance("0");
        setBlHash("");
        return;
      }

      const balanceValue = await contract?.escrowBalance?.().catch(() => 0n);
      const shipmentCount = await contract?.shipmentCount?.().catch(() => 0n);

      if (Number(shipmentCount) > 0) {
        const latestShipment = await contract?.shipments?.(shipmentCount).catch(() => null);
        setCurrentShipmentId(shipmentCount.toString());
        setStatus(Number(latestShipment?.state ?? 0));
        setBlHash(latestShipment?.billOfLadingHash || "");
      } else {
        setCurrentShipmentId("");
        setStatus(0);
        setBlHash("");
      }

      setEscrowBalance(formatEther(balanceValue ?? 0n));
    } catch (refreshError) {
      setCurrentShipmentId("");
      setStatus(0);
      setEscrowBalance("0");
      setBlHash("");
      setError("");
      console.error(refreshError);
    } finally {
      setLoadingContract(false);
    }
  };

  const updateBalanceAndNetwork = async (providerInstance, signerToUse) => {
    try {
      const network = await providerInstance.getNetwork();
      setNetworkOk(network.chainId === EXPECTED_CHAIN_ID);

      if (signerToUse) {
        const address = await signerToUse.getAddress();
        setAccount(address);
        const balanceBn = await providerInstance.getBalance(address);
        setBalance(Number(formatEther(balanceBn)).toFixed(4));
      }
    } catch (balanceError) {
      const readableError = getReadableError(balanceError, t("terminal.errors.balanceNetwork"));
      setError(readableError);
      addToast("error", readableError);
      console.error(balanceError);
    }
  };

  const connectWallet = async () => {
    try {
      setError("");
      if (!window.ethereum) {
        setError(t("terminal.errors.metamaskMissing"));
        addToast("error", t("terminal.errors.metamaskMissing"));
        return;
      }

      const providerInstance = getProvider();
      if (!providerInstance) {
        setError(t("terminal.errors.providerCreate"));
        addToast("error", t("terminal.errors.providerCreate"));
        return;
      }

      const network = await providerInstance.getNetwork();
      if (network.chainId !== EXPECTED_CHAIN_ID) {
        await ensureSepoliaNetwork();
      }

      await providerInstance.send("eth_requestAccounts", []);
      const signerInstance = await providerInstance.getSigner();

      setProvider(providerInstance);
      setSigner(signerInstance);

      await updateBalanceAndNetwork(providerInstance, signerInstance);
      await refreshData(providerInstance);

      const currentNetwork = await providerInstance.getNetwork();
      if (currentNetwork.chainId !== EXPECTED_CHAIN_ID) {
        setError("");
      }

      window.ethereum.on("accountsChanged", async (accounts) => {
        if (accounts.length === 0) {
          setAccount("");
          setBalance("0");
          return;
        }

        await updateBalanceAndNetwork(providerInstance, signerInstance);
      });

      window.ethereum.on("chainChanged", async () => {
        await updateBalanceAndNetwork(providerInstance, signerInstance);
        await refreshData(providerInstance);
      });

      setMessage(t("terminal.messages.connected"));
      addToast("success", t("terminal.messages.connected"));
    } catch (connectError) {
      console.error(connectError);
      const readableError =
        connectError?.code === 4001
          ? "MetaMask connection request was rejected."
          : getReadableError(connectError, t("terminal.errors.walletConnect"));
      setError(readableError);
      addToast("error", readableError);
    }
  };

  const onDeposit = async () => {
    if (!signer) {
      setError(t("terminal.errors.connectWalletFirst"));
      addToast("error", t("terminal.errors.connectWalletFirst"));
      return;
    }

    if (!networkOk) {
      setError(t("terminal.errors.wrongNetwork"));
      addToast("error", t("terminal.errors.wrongNetwork"));
      return;
    }

    if (!depositAmount || Number(depositAmount) <= 0) {
      setError(t("terminal.errors.invalidDepositAmount"));
      addToast("error", t("terminal.errors.invalidDepositAmount"));
      return;
    }

    if (!sellerAddress || !isAddress(sellerAddress)) {
      setError(t("terminal.errors.invalidSellerAddress"));
      addToast("error", t("terminal.errors.invalidSellerAddress"));
      return;
    }

    setPendingAction("deposit");
    setError("");
    setMessage(t("terminal.messages.sendingDeposit"));
    addToast("info", t("terminal.messages.blockchainPending"));

    try {
      const contract = getContract(signer);
      const buyerAddress = await signer.getAddress();
      const ethValue = parseEther(depositAmount.toString());
      const tx = await contract.createShipment(sellerAddress, "", { value: ethValue });
      await tx.wait();

      const shipmentCount = await contract.shipmentCount();
      const shipmentId = shipmentCount.toString();

      if (supabase) {
        addToast("info", t("terminal.messages.syncingDatabase"));
        const { error: insertError } = await supabase.from("shipments").insert({
          blockchain_id: Number(shipmentId),
          buyer: buyerAddress,
          seller: sellerAddress,
          amount: Number(depositAmount),
          bl_hash: "",
          document_url: null,
          status: "Locked",
        });

        if (insertError) {
          throw insertError;
        }
      }

      setMessage(t("terminal.messages.depositSuccess", { shipmentId }));
      addToast("success", t("terminal.messages.depositSuccess", { shipmentId }));
      setCurrentShipmentId(shipmentId);
      setDepositAmount("");
      setWithdrawId(shipmentId);
      await refreshData();
      await updateBalanceAndNetwork(provider, signer);
      await fetchTransactions();
    } catch (depositError) {
      console.error(depositError);
      const readableError =
        depositError?.code === 4001
          ? "Transaction rejected in MetaMask."
          : depositError?.message?.toLowerCase().includes("insufficient funds")
            ? "Not enough SepoliaETH to complete this deposit."
            : getReadableError(depositError, t("terminal.errors.depositFailed"));
      setError(readableError);
      addToast("error", readableError);
    } finally {
      setPendingAction("");
    }
  };

  const onSubmitBL = async () => {
    if (!signer) {
      setError(t("terminal.errors.connectWalletFirst"));
      addToast("error", t("terminal.errors.connectWalletFirst"));
      return;
    }

    if (!networkOk) {
      setError(t("terminal.errors.wrongNetwork"));
      addToast("error", t("terminal.errors.wrongNetwork"));
      return;
    }

    if (!blFile || blFile.type !== "application/pdf") {
      setError(t("terminal.errors.invalidPdf"));
      addToast("error", t("terminal.errors.invalidPdf"));
      return;
    }

    if (!supabase) {
      setError(t("terminal.errors.supabaseMissing"));
      addToast("error", t("terminal.errors.supabaseMissing"));
      return;
    }

    setPendingAction("submitBL");
    setError("");
    setMessage(t("terminal.messages.uploadingDocument"));
    addToast("info", t("terminal.messages.uploadingCloud"));

    try {
      const contract = getContract(signer);
      const shipmentId = currentShipmentId || (await contract.shipmentCount()).toString();

      if (!shipmentId || Number(shipmentId) < 1) {
        throw new Error(t("terminal.errors.noShipmentForBL"));
      }

      let hashHex = "";
      try {
        const fileBuffer = await blFile.arrayBuffer();
        const digest = await window.crypto.subtle.digest("SHA-256", fileBuffer);
        hashHex = `0x${Array.from(new Uint8Array(digest))
          .map((byte) => byte.toString(16).padStart(2, "0"))
          .join("")}`;
      } catch (hashError) {
        console.error(hashError);
        throw new Error(t("terminal.errors.hashFailed"));
      }

      const safeFileName = blFile.name.replace(/[^a-zA-Z0-9._-]/g, "_");
      const filePath = `shipments/${shipmentId}/${Date.now()}-${safeFileName}`;
      const { error: uploadError } = await supabase.storage
        .from("documents")
        .upload(filePath, blFile, {
          cacheControl: "3600",
          upsert: true,
          contentType: "application/pdf",
        });

      if (uploadError) {
        throw new Error(t("terminal.errors.uploadFailed"));
      }

      const { data: publicUrlData } = supabase.storage.from("documents").getPublicUrl(filePath);
      const documentUrl = publicUrlData?.publicUrl || null;

      addToast("info", t("terminal.messages.blockchainPending"));
      const tx = await contract.submitBL(hashHex);
      await tx.wait();

      addToast("info", t("terminal.messages.syncingDatabase"));
      const { error: updateError } = await supabase
        .from("shipments")
        .update({ bl_hash: hashHex, document_url: documentUrl })
        .eq("blockchain_id", Number(shipmentId));

      if (updateError) {
        throw updateError;
      }

      setMessage(t("terminal.messages.blSuccess", { shipmentId }));
      addToast("success", t("terminal.messages.blSuccess", { shipmentId }));
      setBlFile(null);
      await refreshData();
      await fetchTransactions();
    } catch (submitError) {
      console.error(submitError);
      const readableError =
        submitError?.code === 4001
          ? "Transaction rejected in MetaMask."
          :
        submitError?.message === t("terminal.errors.noShipmentForBL") ||
          submitError?.message === t("terminal.errors.hashFailed") ||
          submitError?.message === t("terminal.errors.uploadFailed")
          ? submitError.message
          : getReadableError(submitError, t("terminal.errors.submitBLFailed"));
      setError(readableError);
      addToast("error", readableError);
    } finally {
      setPendingAction("");
    }
  };

  const onWithdraw = async () => {
    if (!signer) {
      setError(t("terminal.errors.connectWalletFirst"));
      addToast("error", t("terminal.errors.connectWalletFirst"));
      return;
    }

    if (!networkOk) {
      setError(t("terminal.errors.wrongNetwork"));
      addToast("error", t("terminal.errors.wrongNetwork"));
      return;
    }

    if (!withdrawId || Number(withdrawId) < 1) {
      setError(t("terminal.errors.invalidShipmentId"));
      addToast("error", t("terminal.errors.invalidShipmentId"));
      return;
    }

    setPendingAction("withdraw");
    setError("");
    setMessage(t("terminal.messages.sendingWithdraw"));
    addToast("info", t("terminal.messages.blockchainPending"));

    try {
      const contract = getContract(signer);
      const tx = await contract.withdraw(Number(withdrawId));
      await tx.wait();

      if (supabase) {
        addToast("info", t("terminal.messages.syncingDatabase"));
        const { error: updateError } = await supabase
          .from("shipments")
          .update({ status: "Released" })
          .eq("blockchain_id", Number(withdrawId));

        if (updateError) {
          throw updateError;
        }
      }

      setMessage(t("terminal.messages.withdrawSuccess"));
      addToast("success", t("terminal.messages.withdrawSuccess"));
      await refreshData();
      await updateBalanceAndNetwork(provider, signer);
      await fetchTransactions();
    } catch (withdrawError) {
      console.error(withdrawError);
      const readableError =
        withdrawError?.code === 4001
          ? "Transaction rejected in MetaMask."
          : withdrawError?.message?.toLowerCase().includes("insufficient funds")
            ? "Not enough SepoliaETH to cover gas for this withdrawal."
            : getReadableError(withdrawError, t("terminal.errors.withdrawFailed"));
      setError(readableError);
      addToast("error", readableError);
    } finally {
      setPendingAction("");
    }
  };

  useEffect(() => {
    fetchTransactions();
  }, [i18n.language, account]);

  useEffect(() => {
    if (!provider || !signer) return;
    refreshData(provider);
  }, [provider, signer]);

  const handleBLFileChange = (event) => {
    const selectedFile = event.target.files?.[0] || null;
    setBlFile(selectedFile);
  };

  return (
    <div className="terminal">
      <Navbar showBack onBack={() => navigate("/")} />
      <h2>{t("terminal.title")}</h2>
      <div className="app-container">
        <div className="toast-stack" aria-live="polite">
          {toasts.map((toast) => (
            <div key={toast.id} className={`toast-item ${toast.type}`}>
              {toast.text}
            </div>
          ))}
        </div>

        {!networkOk && account ? (
          <div className="network-alert card">{t("terminal.errors.wrongNetwork")}</div>
        ) : null}

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
          shipmentId={currentShipmentId}
          status={status}
          escrowBalance={escrowBalance}
          blHash={blHash}
          loading={loadingContract}
        />

        <ActionPanel
          depositAmount={depositAmount}
          setDepositAmount={setDepositAmount}
          sellerAddress={sellerAddress}
          setSellerAddress={setSellerAddress}
          blFile={blFile}
          onBLFileChange={handleBLFileChange}
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

        <div className="transactions-history card">
          <h2>{t("terminal.historyTitle")}</h2>
          {loadingTransactions ? (
            <div className="loading">{t("terminal.loadingHistory")}</div>
          ) : transactions.length === 0 ? (
            <div className="empty-history">{t("terminal.noTransactions")}</div>
          ) : (
            <div className="history-table-wrapper">
              <table className="history-table">
                <thead>
                  <tr>
                    <th>{t("terminal.table.id")}</th>
                    <th>{t("terminal.table.buyer")}</th>
                    <th>{t("terminal.table.seller")}</th>
                    <th>{t("terminal.table.amount")}</th>
                    <th>{t("terminal.table.blHash")}</th>
                    <th>{t("terminal.table.document")}</th>
                    <th>{t("terminal.table.priority")}</th>
                    <th>{t("terminal.table.status")}</th>
                  </tr>
                </thead>
                <tbody>
                  {transactions.map((tx) => (
                    <tr key={tx.blockchain_id}>
                      <td>
                        <a
                          className="history-id-link"
                          href={contractExplorerUrl}
                          target="_blank"
                          rel="noreferrer"
                          title={`Open Syncrobill contract on Sepolia Etherscan for shipment #${tx.blockchain_id}`}
                          aria-label={`Open Syncrobill contract on Sepolia Etherscan for shipment #${tx.blockchain_id}`}
                        >
                          <span>#{tx.blockchain_id}</span>
                          <ExternalLink size={14} strokeWidth={2} />
                        </a>
                      </td>
                      <td>{formatWallet(tx.buyer)}</td>
                      <td>{formatWallet(tx.seller)}</td>
                      <td>{tx.amount} ETH</td>
                      <td className="history-hash">{tx.bl_hash || t("contract.notSubmitted")}</td>
                      <td>
                        {tx.document_url ? (
                          <a
                            className="document-link"
                            href={tx.document_url}
                            target="_blank"
                            rel="noreferrer"
                            title={t("terminal.document.open")}
                            aria-label={t("terminal.document.open")}
                          >
                            <FileText size={18} />
                          </a>
                        ) : (
                          <span className="document-missing">{t("terminal.document.missing")}</span>
                        )}
                      </td>
                      <td>
                        <span
                          className={`priority-badge ${
                            !tx.bl_hash ? "required" : tx.status === "Released" ? "done" : "ready"
                          }`}
                        >
                          {getPriority(tx)}
                        </span>
                      </td>
                      <td>
                        <div className="status-cell">
                          <span
                            className={`status-badge ${
                              tx.status === "Released" ? "released" : "locked"
                            }`}
                          >
                            {tx.status === "Released"
                              ? t("terminal.status.released")
                              : t("terminal.status.locked")}
                          </span>
                          <a
                            className="status-explorer-link"
                            href={contractExplorerUrl}
                            target="_blank"
                            rel="noreferrer"
                            title="View contract activity on Sepolia Etherscan"
                            aria-label="View contract activity on Sepolia Etherscan"
                          >
                            <ExternalLink size={14} strokeWidth={2} />
                          </a>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
      <footer className="terminal-footer">{t("terminal.footer")}</footer>
    </div>
  );
}

export default Terminal;
