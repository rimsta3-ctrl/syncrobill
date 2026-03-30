import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { formatEther, getBytes, isAddress, parseEther } from "ethers";
import { ExternalLink, FileText } from "lucide-react";
import { CONTRACT_ADDRESS } from "../constants";
import {
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
const BL_VALIDATION_API_URL =
  import.meta.env.VITE_BL_API_URL || "http://localhost:8000/validate-bl";
const EMPTY_BYTES32 = `0x${"0".repeat(64)}`;

const normalizeHash = (value = "") => {
  if (!value || value === EMPTY_BYTES32) {
    return "";
  }
  return value;
};

const COMPLETION_POPUP_MESSAGES = {
  en: "Congratulations! Your transaction has been successfully established.",
  fr: "Félicitations ! Votre transaction a été établie avec succès.",
  de: "Glückwunsch! Ihre Transaktion wurde erfolgreich abgeschlossen.",
  it: "Congratulazioni! La tua transazione è stata conclusa con successo.",
  es: "¡Felicidades! Su transacción se ha completado con éxito.",
  ar: "تهانينا! تم إتمام معاملتك بنجاح.",
};

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
  const [shipment, setShipment] = useState({
    id: "",
    status: 0,
    blHash: "",
    isValidatedByAI: false,
    depositedAmount: "0",
  });
  const [escrowBalance, setEscrowBalance] = useState("0");
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
  const [showCompletionPopup, setShowCompletionPopup] = useState(false);
  const [withdrawLocked, setWithdrawLocked] = useState(false);
  const [forceClosedStep, setForceClosedStep] = useState(false);

  const currentShipmentId = shipment.id;
  const status = shipment.status;
  const blHash = shipment.blHash;
  const isValidatedByAI = shipment.isValidatedByAI;
  const depositedAmount = shipment.depositedAmount;
  const completionPopupMessage =
    COMPLETION_POPUP_MESSAGES[i18n.language] || COMPLETION_POPUP_MESSAGES.en;
  const isDismissed =
    localStorage.getItem(`syncrobill_closed_${currentShipmentId}`) === "true";
  const shouldShowCompletionPopup =
    Number(status) === 2 && !forceClosedStep && !isDismissed;

  const waitForUiRefresh = (delayMs = 450) =>
    new Promise((resolve) => {
      window.setTimeout(resolve, delayMs);
    });

  const applyShipmentState = ({
    id = "",
    status: nextStatus = 0,
    blHash: nextBlHash = "",
    isValidatedByAI: nextIsValidatedByAI = false,
    depositedAmount: nextDepositedAmount = "0",
  } = {}) => {
    setShipment({
      id: id ? String(id) : "",
      status: Number(nextStatus ?? 0),
      blHash: normalizeHash(nextBlHash),
      isValidatedByAI: Boolean(nextIsValidatedByAI),
      depositedAmount: String(nextDepositedAmount ?? "0"),
    });
  };

  const prepareNextShipment = async (shipmentIdToAdvanceFrom = "") => {
    const baseId = Number(shipmentIdToAdvanceFrom || currentShipmentId || 0);
    const nextShipmentId = baseId > 0 ? String(baseId + 1) : "1";

    setShowCompletionPopup(false);
    setForceClosedStep(false);
    setWithdrawLocked(false);
    setPendingAction("");
    setMessage("");
    setError("");
    setBlFile(null);
    setEscrowBalance("0");
    setDepositAmount("0.01");
    setWithdrawId(nextShipmentId);
    applyShipmentState({
      id: nextShipmentId,
      status: 0,
      blHash: "",
      isValidatedByAI: false,
      depositedAmount: "0",
    });

    if (provider && signer) {
      await updateBalanceAndNetwork(provider, signer);
    }
  };

  const handleCompletionPopupClose = () => {
    const completedShipmentId = currentShipmentId;

    localStorage.setItem(`syncrobill_closed_${completedShipmentId}`, "true");

    setShowCompletionPopup(false);
    setForceClosedStep(true);
    setShipment((current) => ({ ...current, status: 3 }));

    window.setTimeout(() => {
      void prepareNextShipment(completedShipmentId);
    }, 3000);
  };

  const fetchShipmentDetails = async (contractInstance, shipmentIdToLoad) => {
    if (!contractInstance || !shipmentIdToLoad || Number(shipmentIdToLoad) < 1) {
      applyShipmentState();
      return null;
    }

    const shipmentDetails = await contractInstance
      .shipments(BigInt(shipmentIdToLoad))
      .catch(() => null);

    // Use shipment value only if still Locked — not the global contract balance
    const shipmentState = Number(shipmentDetails?.state ?? 0);
    const escrowForShipment =
      shipmentState === 1 ? formatEther(shipmentDetails?.value ?? 0n) : "0";

    applyShipmentState({
      id: shipmentIdToLoad,
      status: shipmentDetails?.state,
      blHash: shipmentDetails?.billOfLadingHash,
      isValidatedByAI: shipmentDetails?.isValidatedByAI,
      depositedAmount: formatEther(shipmentDetails?.value ?? 0n),
    });
    setEscrowBalance(escrowForShipment);

    return shipmentDetails;
  };

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
    if (transaction.status === "Validated") {
      return "AI approved";
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
        .select(
          "blockchain_id, buyer, seller, amount, bl_hash, document_url, status"
        )
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
      const readableError = getReadableError(
        fetchTransactionsError,
        t("terminal.errors.historyLoad")
      );
      setError(readableError);
      addToast("error", readableError);
    } finally {
      setLoadingTransactions(false);
    }
  };

  const refreshData = async (providerToUse, shipmentIdOverride = "") => {
    try {
      setLoadingContract(true);
      const providerSafe = providerToUse || provider;
      const signerSafe = signer;

      if (!providerSafe || !signerSafe) {
        applyShipmentState();
        setEscrowBalance("0");
        return { balance: "0", shipment: null };
      }

      const contract = getContract(providerSafe);
      if (!contract) {
        applyShipmentState();
        setEscrowBalance("0");
        return { balance: "0", shipment: null };
      }

      const shipmentCount = await contract?.shipmentCount?.().catch(() => 0n);
      const targetShipmentId =
        shipmentIdOverride || currentShipmentId || shipmentCount.toString();
      let targetShipment = null;

      if (Number(targetShipmentId) > 0) {
        targetShipment = await contract
          ?.shipments?.(BigInt(targetShipmentId))
          .catch(() => null);

        const alreadyClosed =
          localStorage.getItem(`syncrobill_closed_${targetShipmentId}`) === "true";

        if (alreadyClosed) {
          // Shipment fully dismissed — jump to next fresh state
          const nextId = String(Number(targetShipmentId) + 1);
          applyShipmentState({
            id: nextId,
            status: 0,
            blHash: "",
            isValidatedByAI: false,
            depositedAmount: "0",
          });
          setEscrowBalance("0");
          setForceClosedStep(false);
          setWithdrawLocked(false);
          return { balance: "0", shipment: null };
        }

        // Escrow is only non-zero while the shipment is Locked (state 1)
        const shipmentState = Number(targetShipment?.state ?? 0);
        const escrowForShipment =
          shipmentState === 1
            ? formatEther(targetShipment?.value ?? 0n)
            : "0";

        applyShipmentState({
          id: targetShipmentId,
          status: targetShipment?.state,
          blHash: targetShipment?.billOfLadingHash,
          isValidatedByAI: targetShipment?.isValidatedByAI,
          depositedAmount: formatEther(targetShipment?.value ?? 0n),
        });
        setEscrowBalance(escrowForShipment);
        return { balance: escrowForShipment, shipment: targetShipment };
      } else {
        applyShipmentState();
        setEscrowBalance("0");
        return { balance: "0", shipment: null };
      }
    } catch (refreshError) {
      applyShipmentState();
      setEscrowBalance("0");
      setError("");
      console.error(refreshError);
      return { balance: "0", shipment: null };
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
      const readableError = getReadableError(
        balanceError,
        t("terminal.errors.balanceNetwork")
      );
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
      const tx = await contract.createShipment(sellerAddress, { value: ethValue });
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
      setWithdrawLocked(false);
      setForceClosedStep(false);
      setShowCompletionPopup(false);
      applyShipmentState({ id: shipmentId, status: 1, depositedAmount: depositAmount });
      setDepositAmount("");
      setWithdrawId(shipmentId);
      await refreshData(provider, shipmentId);
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

    setPendingAction("aiValidation");
    setError("");
    setMessage("Analyse IA en cours...");
    addToast("info", "Analyse IA du Bill of Lading en cours...");

    try {
      const contract = getContract(signer);
      const shipmentId = currentShipmentId;

      if (!shipmentId || Number(shipmentId) < 1) {
        throw new Error(t("terminal.errors.noShipmentForBL"));
      }

      const shipmentData = await contract.shipments(Number(shipmentId));
      const expectedAmount = formatEther(shipmentData?.value ?? 0n);

      const validationPayload = new FormData();
      validationPayload.append("file", blFile);
      validationPayload.append("expected_amount", expectedAmount);

      const validationResponse = await fetch(BL_VALIDATION_API_URL, {
        method: "POST",
        body: validationPayload,
      });

      let validationResult = null;
      try {
        validationResult = await validationResponse.json();
      } catch (parseError) {
        console.error(parseError);
      }

      if (!validationResponse.ok) {
        throw new Error(
          validationResult?.detail || "IA validation service is unavailable."
        );
      }

      if (!validationResult?.valid) {
        const rejectionReasons =
          validationResult?.metadata?.validation_errors?.join(" ") ||
          "IA Rejection";
        throw new Error(rejectionReasons);
      }

      const hashHex = validationResult?.hash;
      const signatureHex = validationResult?.signature;

      if (!hashHex || !signatureHex) {
        throw new Error(
          "The validation service returned an incomplete signature payload."
        );
      }

      if (!/^0x[a-fA-F0-9]{64}$/.test(hashHex)) {
        throw new Error(
          "The validation service returned an invalid bytes32 hash."
        );
      }

      let documentUrl = null;
      if (supabase) {
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

        const { data: publicUrlData } = supabase.storage
          .from("documents")
          .getPublicUrl(filePath);
        documentUrl = publicUrlData?.publicUrl || null;
      }

      setPendingAction("blockchainSignature");
      setMessage("Signature Blockchain...");
      addToast("info", "Signature IA validée. Ouverture de MetaMask...");

      const tx = await contract.submitBL(
        BigInt(shipmentId),
        hashHex,
        getBytes(signatureHex)
      );
      const receipt = await tx.wait();
      setShipment((current) => ({
        ...current,
        id: String(shipmentId),
        blHash: normalizeHash(hashHex),
        isValidatedByAI: true,
        status: Math.max(Number(current.status ?? 0), 1),
      }));

      const blValidatedEventSeen = receipt?.logs?.some((log) => {
        try {
          return contract.interface.parseLog(log)?.name === "BLValidated";
        } catch {
          return false;
        }
      });

      await fetchShipmentDetails(contract, shipmentId);
      await waitForUiRefresh(blValidatedEventSeen ? 450 : 700);
      await fetchShipmentDetails(contract, shipmentId);
      setWithdrawId(String(shipmentId));

      if (supabase) {
        addToast("info", t("terminal.messages.syncingDatabase"));
        const { error: updateError } = await supabase
          .from("shipments")
          .update({ bl_hash: hashHex, document_url: documentUrl, status: "Validated" })
          .eq("blockchain_id", Number(shipmentId));

        if (updateError) {
          console.error(updateError);
          addToast("error", "Database sync failed after withdrawal.");
        }
      }

      setMessage(t("terminal.messages.blSuccess", { shipmentId }));
      addToast("success", t("terminal.messages.blSuccess", { shipmentId }));
      setBlFile(null);
      await waitForUiRefresh(250);
      await refreshData(provider, shipmentId);
      await fetchTransactions();
    } catch (submitError) {
      console.error(submitError);
      const readableError =
        submitError?.code === 4001
          ? "Transaction rejected in MetaMask."
          : submitError?.message === t("terminal.errors.noShipmentForBL") ||
            submitError?.message === t("terminal.errors.uploadFailed") ||
            submitError?.message?.includes("IA Rejection") ||
            submitError?.message?.includes("Missing required") ||
            submitError?.message?.includes("Expected amount")
          ? submitError.message
          : getReadableError(submitError, t("terminal.errors.submitBLFailed"));
      setError(readableError);
      addToast("error", readableError);
    } finally {
      setPendingAction("");
    }
  };

  const onWithdraw = async () => {
    const targetWithdrawId = (withdrawId || currentShipmentId || "").toString();

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
    if (!targetWithdrawId || Number(targetWithdrawId) < 1) {
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
      const tx = await contract.withdraw(Number(targetWithdrawId));
      await tx.wait();

      // 1. Lock button immediately after tx confirmation
      setWithdrawLocked(true);
      setForceClosedStep(false);

      // 2. SETTLED step → green: status becomes 2
      setShipment((current) => ({
        ...current,
        status: 2,
      }));
      setEscrowBalance("0");
      setPendingAction("");

      window.setTimeout(() => {
        setShowCompletionPopup(true);
      }, 150);

      window.setTimeout(() => {
        void (async () => {
          if (supabase) {
            addToast("info", t("terminal.messages.syncingDatabase"));
            const { error: updateError } = await supabase
              .from("shipments")
              .update({ status: "Released" })
              .eq("blockchain_id", Number(targetWithdrawId));

            if (updateError) {
              console.error(updateError);
              addToast("error", "Database sync failed after withdrawal.");
            }
          }

          setMessage(t("terminal.messages.withdrawSuccess"));
          addToast("success", t("terminal.messages.withdrawSuccess"));

          await updateBalanceAndNetwork(provider, signer);
          await fetchTransactions();
        })().catch((backgroundError) => {
          console.error(backgroundError);
        });
      }, 1000);
      return;

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

  useEffect(() => {
    if (!provider || !signer || !window.ethereum) return;

    const handleAccountsChanged = async (accounts) => {
      if (accounts.length === 0) {
        setAccount("");
        setBalance("0");
        return;
      }
      await updateBalanceAndNetwork(provider, signer);
    };

    const handleChainChanged = async () => {
      await updateBalanceAndNetwork(provider, signer);
      await refreshData(provider);
    };

    window.ethereum.on("accountsChanged", handleAccountsChanged);
    window.ethereum.on("chainChanged", handleChainChanged);

    return () => {
      window.ethereum.removeListener("accountsChanged", handleAccountsChanged);
      window.ethereum.removeListener("chainChanged", handleChainChanged);
    };
  }, [provider, signer]);

  useEffect(() => {
    if (!provider) return;

    const contract = getContract(provider);
    if (!contract) return;

    const handleBLValidated = async (validatedShipmentId) => {
      const nextShipmentId = validatedShipmentId?.toString?.() || "";
      if (!nextShipmentId) return;

      setMessage(`Shipment #${nextShipmentId} validated on-chain.`);
      addToast(
        "success",
        `Shipment #${nextShipmentId} passed blockchain validation.`
      );
      await waitForUiRefresh(250);
      await fetchShipmentDetails(contract, nextShipmentId);
      await refreshData(provider, nextShipmentId);
      await fetchTransactions();
    };

    contract.on("BLValidated", handleBLValidated);

    return () => {
      contract.off("BLValidated", handleBLValidated);
    };
  }, [provider, account]);

  const handleBLFileChange = (event) => {
    const selectedFile = event.target.files?.[0] || null;
    setBlFile(selectedFile);
  };

  return (
    <div className="terminal">
      {shouldShowCompletionPopup && (
        <div
          className="completion-popup-overlay"
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 999999,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: "rgba(0, 0, 0, 0.85)",
          }}
        >
          <div className="completion-popup card">
            <div className="completion-popup-icon" aria-hidden="true">
              ✓
            </div>
            <h3>{completionPopupMessage}</h3>
            <p className="completion-popup-message">
              The withdrawal has been confirmed and the shipment is ready to close.
            </p>
            <button
              className="btn primary completion-popup-button"
              onClick={handleCompletionPopupClose}
            >
              OK
            </button>
          </div>
        </div>
      )}
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
          <div className="network-alert card">
            {t("terminal.errors.wrongNetwork")}
          </div>
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
          account={account}
          status={status}
          escrowBalance={escrowBalance}
          depositedAmount={depositedAmount}
          blHash={blHash}
          isValidatedByAI={Boolean(shipment.isValidatedByAI || shipment.blHash)}
          forceClosed={Boolean(forceClosedStep && currentShipmentId && account)}
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
          currentShipmentId={currentShipmentId}
          status={status}
          isValidatedByAI={Boolean(shipment.isValidatedByAI || shipment.blHash)}
          onDeposit={onDeposit}
          onSubmitBL={onSubmitBL}
          onWithdraw={onWithdraw}
          canWithdraw={isValidatedByAI && Number(escrowBalance) > 0}
          withdrawLocked={
            withdrawLocked || status >= 2 || Number(escrowBalance) === 0
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
                      <td className="history-hash">
                        {tx.bl_hash || t("contract.notSubmitted")}
                      </td>
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
                          <span className="document-missing">
                            {t("terminal.document.missing")}
                          </span>
                        )}
                      </td>
                      <td>
                        <span
                          className={`priority-badge ${
                            !tx.bl_hash
                              ? "required"
                              : tx.status === "Released"
                              ? "done"
                              : "ready"
                          }`}
                        >
                          {getPriority(tx)}
                        </span>
                      </td>
                      <td>
                        <div className="status-cell">
                          <span
                            className={`status-badge ${
                              tx.status === "Released"
                                ? "released"
                                : tx.status === "Validated"
                                ? "validated"
                                : "locked"
                            }`}
                          >
                            {tx.status === "Released"
                              ? t("terminal.status.released")
                              : tx.status === "Validated"
                              ? "Validated"
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