import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { formatEther, isAddress, parseEther } from "ethers";
import { FileText } from "lucide-react";
import { getProvider, getContract, EXPECTED_CHAIN_ID } from "../utils/blockchain";
import { supabase } from "../supabaseClient";
import { useTranslation } from "../i18n";
import WalletStatus from "./WalletStatus";
import ContractInfo from "./ContractInfo";
import ActionPanel from "./ActionPanel";
import Navbar from "./Navbar";

const formatWallet = (value = "") =>
  value ? `${value.slice(0, 6)}...${value.slice(-4)}` : "-";

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
  const [pendingAction, setPendingAction] = useState("");
  const [loadingContract, setLoadingContract] = useState(false);
  const [provider, setProvider] = useState(null);
  const [signer, setSigner] = useState(null);

  const fetchTransactions = async () => {
    if (!supabase) return;

    try {
      setLoadingTransactions(true);
      const { data, error: fetchError } = await supabase
        .from("shipments")
        .select("blockchain_id, buyer, seller, amount, bl_hash, document_url, status")
        .order("blockchain_id", { ascending: false });

      if (fetchError) {
        throw fetchError;
      }

      setTransactions(data || []);
    } catch (fetchTransactionsError) {
      console.error(fetchTransactionsError);
      setError(t("terminal.errors.historyLoad"));
    } finally {
      setLoadingTransactions(false);
    }
  };

  const refreshData = async (providerToUse) => {
    try {
      setLoadingContract(true);
      const providerSafe = providerToUse || provider;
      if (!providerSafe) return;

      const contract = getContract(providerSafe);
      const balanceValue = await contract.escrowBalance();
      const shipmentCount = await contract.shipmentCount();

      if (Number(shipmentCount) > 0) {
        const latestShipment = await contract.shipments(shipmentCount);
        setCurrentShipmentId(shipmentCount.toString());
        setStatus(Number(latestShipment.state));
        setBlHash(latestShipment.billOfLadingHash || "");
      } else {
        setCurrentShipmentId("");
        setStatus(0);
        setBlHash("");
      }

      setEscrowBalance(formatEther(balanceValue));
    } catch (refreshError) {
      setError(t("terminal.errors.contractRead"));
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
        setBalance(parseFloat(balanceBn.toString() / 1e18).toFixed(4));
      }
    } catch (balanceError) {
      setError(t("terminal.errors.balanceNetwork"));
      console.error(balanceError);
    }
  };

  const connectWallet = async () => {
    try {
      setError("");
      if (!window.ethereum) {
        setError(t("terminal.errors.metamaskMissing"));
        return;
      }

      const providerInstance = getProvider();
      if (!providerInstance) {
        setError(t("terminal.errors.providerCreate"));
        return;
      }

      await providerInstance.send("eth_requestAccounts", []);
      const signerInstance = await providerInstance.getSigner();

      setProvider(providerInstance);
      setSigner(signerInstance);

      await updateBalanceAndNetwork(providerInstance, signerInstance);
      await refreshData(providerInstance);

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
    } catch (connectError) {
      console.error(connectError);
      setError(t("terminal.errors.walletConnect"));
    }
  };

  const onDeposit = async () => {
    if (!signer) {
      setError(t("terminal.errors.connectWalletFirst"));
      return;
    }

    if (!depositAmount || Number(depositAmount) <= 0) {
      setError(t("terminal.errors.invalidDepositAmount"));
      return;
    }

    if (!sellerAddress || !isAddress(sellerAddress)) {
      setError(t("terminal.errors.invalidSellerAddress"));
      return;
    }

    setPendingAction("deposit");
    setError("");
    setMessage(t("terminal.messages.sendingDeposit"));

    try {
      const contract = getContract(signer);
      const buyerAddress = await signer.getAddress();
      const ethValue = parseEther(depositAmount.toString());
      const tx = await contract.createShipment(sellerAddress, "", { value: ethValue });
      await tx.wait();

      const shipmentCount = await contract.shipmentCount();
      const shipmentId = shipmentCount.toString();

      if (supabase) {
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
      setCurrentShipmentId(shipmentId);
      setDepositAmount("");
      setWithdrawId(shipmentId);
      await refreshData();
      await updateBalanceAndNetwork(provider, signer);
      await fetchTransactions();
    } catch (depositError) {
      console.error(depositError);
      setError(t("terminal.errors.depositFailed"));
    } finally {
      setPendingAction("");
    }
  };

  const onSubmitBL = async () => {
    if (!signer) {
      setError(t("terminal.errors.connectWalletFirst"));
      return;
    }

    if (!blFile || blFile.type !== "application/pdf") {
      setError(t("terminal.errors.invalidPdf"));
      return;
    }

    if (!supabase) {
      setError(t("terminal.errors.supabaseMissing"));
      return;
    }

    setPendingAction("submitBL");
    setError("");
    setMessage(t("terminal.messages.uploadingDocument"));

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

      const tx = await contract.submitBL(hashHex);
      await tx.wait();

      const { error: updateError } = await supabase
        .from("shipments")
        .update({ bl_hash: hashHex, document_url: documentUrl })
        .eq("blockchain_id", Number(shipmentId));

      if (updateError) {
        throw updateError;
      }

      setMessage(t("terminal.messages.blSuccess", { shipmentId }));
      setBlFile(null);
      await refreshData();
      await fetchTransactions();
    } catch (submitError) {
      console.error(submitError);
      setError(
        submitError?.message === t("terminal.errors.noShipmentForBL") ||
          submitError?.message === t("terminal.errors.hashFailed") ||
          submitError?.message === t("terminal.errors.uploadFailed")
          ? submitError.message
          : t("terminal.errors.submitBLFailed")
      );
    } finally {
      setPendingAction("");
    }
  };

  const onWithdraw = async () => {
    if (!signer) {
      setError(t("terminal.errors.connectWalletFirst"));
      return;
    }

    if (!withdrawId || Number(withdrawId) < 1) {
      setError(t("terminal.errors.invalidShipmentId"));
      return;
    }

    setPendingAction("withdraw");
    setError("");
    setMessage(t("terminal.messages.sendingWithdraw"));

    try {
      const contract = getContract(signer);
      const tx = await contract.withdraw(Number(withdrawId));
      await tx.wait();

      if (supabase) {
        const { error: updateError } = await supabase
          .from("shipments")
          .update({ status: "Released" })
          .eq("blockchain_id", Number(withdrawId));

        if (updateError) {
          throw updateError;
        }
      }

      setMessage(t("terminal.messages.withdrawSuccess"));
      await refreshData();
      await updateBalanceAndNetwork(provider, signer);
      await fetchTransactions();
    } catch (withdrawError) {
      console.error(withdrawError);
      setError(t("terminal.errors.withdrawFailed"));
    } finally {
      setPendingAction("");
    }
  };

  useEffect(() => {
    fetchTransactions();
  }, [i18n.language]);

  const handleBLFileChange = (event) => {
    const selectedFile = event.target.files?.[0] || null;
    setBlFile(selectedFile);
  };

  return (
    <div className="terminal">
      <Navbar showBack onBack={() => navigate("/")} />
      <h2>{t("terminal.title")}</h2>
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
                    <th>{t("terminal.table.status")}</th>
                  </tr>
                </thead>
                <tbody>
                  {transactions.map((tx) => (
                    <tr key={tx.blockchain_id}>
                      <td>#{tx.blockchain_id}</td>
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
                          className={`status-badge ${
                            tx.status === "Released" ? "released" : "locked"
                          }`}
                        >
                          {tx.status === "Released"
                            ? t("terminal.status.released")
                            : t("terminal.status.locked")}
                        </span>
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
