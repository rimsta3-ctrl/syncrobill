import { useState, useEffect, useCallback, useRef } from "react";
import { formatEther, getBytes, parseEther, isAddress } from "ethers";
import { getContract } from "../utils/blockchain";

const EMPTY_BYTES32 = `0x${"0".repeat(64)}`;
const BL_VALIDATION_API_URL =
  import.meta.env.VITE_BL_API_URL || "http://localhost:8000/validate-bl";

// FIX: timeout for AI backend call (30 seconds)
const BL_API_TIMEOUT_MS = 30_000;

const normalizeHash = (value = "") =>
  !value || value === EMPTY_BYTES32 ? "" : value;

const wait = (ms = 450) => new Promise((res) => window.setTimeout(res, ms));

/**
 * fetchWithTimeout — wraps fetch() with an AbortController timeout.
 * Throws a user-friendly error if the backend is unreachable or too slow.
 */
async function fetchWithTimeout(url, options = {}, timeoutMs = BL_API_TIMEOUT_MS) {
  const controller = new AbortController();
  const timer = window.setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, { ...options, signal: controller.signal });
    return response;
  } catch (err) {
    if (err.name === "AbortError") {
      throw new Error(`AI validation service timed out after ${timeoutMs / 1000}s. Please try again.`);
    }
    throw err;
  } finally {
    window.clearTimeout(timer);
  }
}

async function validateBLWithAI({ file, expectedAmount }) {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("expected_amount", expectedAmount);

  const validationResponse = await fetchWithTimeout(BL_VALIDATION_API_URL, {
    method: "POST",
    body: formData,
  });

  let validationResult = null;
  try {
    validationResult = await validationResponse.json();
  } catch {
    validationResult = null;
  }

  return { validationResponse, validationResult };
}

/**
 * useShipment
 *
 * Responsabilités :
 *   - Lecture de l'état d'un shipment depuis le contrat
 *   - createShipment (deposit)
 *   - submitBL  (validation IA + signature on-chain)
 *   - withdraw
 *   - Écoute de l'event on-chain BLValidated
 *
 * Ce hook ne sait rien de Supabase (il expose des callbacks
 * optionnels `onDepositSuccess`, `onBLSuccess`, `onWithdrawSuccess`
 * que Terminal branche sur useSupabase).
 */
export function useShipment({
  provider,
  signer,
  networkOk,
  account,
  onDepositSuccess,
  onBLSuccess,
  onWithdrawSuccess,
} = {}) {
  const [shipment, setShipment] = useState({
    id: "",
    status: 0,
    blHash: "",
    isValidatedByAI: false,
    depositedAmount: "0",
    seller: "",
  });
  const [escrowBalance,  setEscrowBalance]  = useState("0");
  const [pendingAction,  setPendingAction]  = useState("");
  const [loadingContract, setLoadingContract] = useState(false);
  const [withdrawLocked, setWithdrawLocked] = useState(false);
  const [forceClosedStep, setForceClosedStep] = useState(false);
  const [showCompletionPopup, setShowCompletionPopup] = useState(false);
  const [error,   setError]   = useState("");
  const [message, setMessage] = useState("");
  const previousShipmentIdRef = useRef("");

  // ---------- helpers ----------

  const applyShipmentState = useCallback(({
    id = "",
    status: s = 0,
    blHash: h = "",
    isValidatedByAI: ai = false,
    depositedAmount: amt = "0",
    seller: sel = "",
  } = {}) => {
    setShipment({
      id:              id ? String(id) : "",
      status:          Number(s ?? 0),
      blHash:          normalizeHash(h),
      isValidatedByAI: Boolean(ai),
      depositedAmount: String(amt ?? "0"),
      seller:          sel ? sel.toLowerCase() : "",
    });
  }, []);

  const fetchShipmentFromChain = useCallback(async (contractInstance, shipmentId) => {
    if (!contractInstance || !shipmentId || Number(shipmentId) < 1) {
      applyShipmentState();
      return null;
    }
    const data = await contractInstance.shipments(BigInt(shipmentId)).catch(() => null);
    const state = Number(data?.state ?? 0);
    const escrow = state === 1 ? formatEther(data?.value ?? 0n) : "0";

    applyShipmentState({
      id:              shipmentId,
      status:          data?.state,
      blHash:          data?.billOfLadingHash,
      isValidatedByAI: data?.isValidatedByAI,
      depositedAmount: formatEther(data?.value ?? 0n),
      seller:          data?.seller || "",
    });
    setEscrowBalance(escrow);
    return data;
  }, [applyShipmentState]);

  const findLatestRelevantShipmentId = useCallback(async (contractInstance, walletAccount) => {
    if (!contractInstance || !walletAccount) return "";

    const normalizedAccount = walletAccount.toLowerCase();
    let latestBuyerShipmentId = "";
    let latestSellerActiveShipmentId = "";

    try {
      const buyerFilter = contractInstance.filters.ShipmentCreated(null, walletAccount);
      const buyerEvents = await contractInstance.queryFilter(buyerFilter);
      if (buyerEvents.length > 0) {
        latestBuyerShipmentId =
          buyerEvents[buyerEvents.length - 1].args?.[0]?.toString() || "";
      }
    } catch {
      // Ignore unsupported indexed filtering and fall back to the global scan below.
    }

    try {
      const createdEvents = await contractInstance.queryFilter(
        contractInstance.filters.ShipmentCreated()
      );

      for (let i = createdEvents.length - 1; i >= 0; i--) {
        const id = createdEvents[i].args?.[0]?.toString();
        if (!id) continue;

        const data = await contractInstance.shipments(BigInt(id)).catch(() => null);
        if (!data) continue;

        const seller = data?.seller?.toLowerCase?.() || "";
        if (seller !== normalizedAccount) continue;

        if (Number(data.state) === 1) {
          latestSellerActiveShipmentId = id;
          break;
        }
      }
    } catch {
      // Ignore query failures; caller will fall back to current local state.
    }

    return latestSellerActiveShipmentId || latestBuyerShipmentId || "";
  }, []);

  // ---------- refresh (called externally too) ----------

  const refresh = useCallback(async (overrideId = "") => {
    if (!provider || !signer) return;
    try {
      setLoadingContract(true);
      const contract = getContract(provider);

      let targetId = overrideId;

      if (!targetId && account) {
        const latestRelevantId = await findLatestRelevantShipmentId(contract, account);
        if (latestRelevantId) {
          targetId = latestRelevantId;
        }
      }

      if (!targetId) {
        targetId = shipment.id;
      }

      if (!targetId) {
        applyShipmentState();
        setEscrowBalance("0");
        return;
      }

      if (Number(targetId) <= 0) { applyShipmentState(); return; }

      const dismissed =
        localStorage.getItem(`syncrobill_closed_${targetId}`) === "true";

      if (dismissed) {
        const nextId = String(Number(targetId) + 1);
        applyShipmentState({ id: nextId });
        setEscrowBalance("0");
        setForceClosedStep(false);
        setWithdrawLocked(false);
        return;
      }

      await fetchShipmentFromChain(contract, targetId);
    } catch (err) {
      console.error(err);
      applyShipmentState();
      setEscrowBalance("0");
    } finally {
      setLoadingContract(false);
    }
  }, [
    provider,
    signer,
    account,
    shipment.id,
    applyShipmentState,
    fetchShipmentFromChain,
    findLatestRelevantShipmentId,
  ]);

  // ---------- prepareNextShipment ----------

  const prepareNextShipment = useCallback(async (fromId = "", explicitNextId = "") => {
    const base   = Number(fromId || shipment.id || 0);
    const nextId = explicitNextId || (base > 0 ? String(base + 1) : "1");

    setShowCompletionPopup(false);
    setForceClosedStep(false);
    setWithdrawLocked(false);
    setPendingAction("");
    setMessage("");
    setError("");
    setEscrowBalance("0");
    applyShipmentState({ id: nextId, status: 0, seller: "", isValidatedByAI: false, blHash: "", depositedAmount: "0" });
  }, [shipment.id, applyShipmentState]);

  const handleCompletionPopupClose = useCallback(() => {
    const closedId = shipment.id;
    localStorage.setItem(`syncrobill_closed_${closedId}`, "true");
    setShowCompletionPopup(false);
    setForceClosedStep(true);
    setShipment((cur) => ({ ...cur, status: 3 }));
    window.setTimeout(() => prepareNextShipment(closedId), 3000);
  }, [shipment.id, prepareNextShipment]);

  // ---------- deposit ----------

  const deposit = async ({ sellerAddress, depositAmount }) => {
    if (pendingAction) return;
    if (!provider)  return setError("Connect your wallet first.");
    if (!networkOk) return setError("Wrong network. Switch to Sepolia.");
    if (!depositAmount || Number(depositAmount) <= 0)
      return setError("Enter a valid ETH amount.");
    if (!sellerAddress || !isAddress(sellerAddress))
      return setError("Enter a valid seller address.");

    setPendingAction("deposit");
    setError("");
    setMessage("Sending deposit…");

    try {
      const contract = getContract(signer);
      const buyer    = await signer.getAddress();
      const tx       = await contract.createShipment(sellerAddress, {
        value: parseEther(depositAmount.toString()),
      });
      await tx.wait();

      const count      = await contract.shipmentCount();
      const shipmentId = count.toString();

      applyShipmentState({ id: shipmentId, status: 1, depositedAmount: depositAmount });
      setMessage(`Shipment #${shipmentId} created.`);

      await onDepositSuccess?.({ shipmentId, buyer, sellerAddress, depositAmount });
      await refresh(shipmentId);
    } catch (err) {
      const msg =
        err?.code === 4001
          ? "Transaction rejected in MetaMask."
          : err?.message?.toLowerCase().includes("insufficient funds")
          ? "Not enough SepoliaETH."
          : err?.shortMessage || err?.message || "Deposit failed.";
      setError(msg);
    } finally {
      setPendingAction("");
    }
  };

  // ---------- submitBL ----------

  const submitBL = async ({ blFile, currentShipmentId }) => {
    if (!signer)    return setError("Connect your wallet first.");
    if (!networkOk) return setError("Wrong network. Switch to Sepolia.");
    if (!blFile || blFile.type !== "application/pdf")
      return setError("Please select a valid PDF file.");

    const shipmentId = currentShipmentId || shipment.id;
    if (!shipmentId || Number(shipmentId) < 1)
      return setError("No active shipment found.");

    setPendingAction("aiValidation");
    setError("");
    setMessage("AI analysis in progress…");

    try {
      // 1 — fetch expected amount from chain (READ — use provider, not signer)
      // Using signer here triggers a MetaMask popup before AI validation even starts.
      const readContract   = getContract(provider);
      const data           = await readContract.shipments(Number(shipmentId));
      const expectedAmount = formatEther(data?.value ?? 0n);

      // 2 — call FastAPI backend
      const formData = new FormData();
      formData.append("file",            blFile);
      formData.append("expected_amount", expectedAmount);

      // FIX: use fetchWithTimeout to avoid infinite loading if backend is slow/down
      const validationResponse = await fetchWithTimeout(BL_VALIDATION_API_URL, {
        method: "POST",
        body:   formData,
      });

      let validationResult = null;
      try {
        validationResult = await validationResponse.json();
      } catch {
        validationResult = null;
      }

      if (!validationResponse.ok) {
        return setError(validationResult?.detail || "AI validation service unavailable.");
      }
      if (!validationResult?.valid) {
        return setError(
          validationResult?.metadata?.validation_errors?.join(" ") || "AI rejected the document."
        );
      }

      const { hash: hashHex, signature: signatureHex } = validationResult;

      if (!hashHex || !signatureHex)
        throw new Error("Validation service returned incomplete payload.");
      if (!/^0x[a-fA-F0-9]{64}$/.test(hashHex))
        throw new Error("Invalid bytes32 hash from validation service.");

      // 3 — submit on-chain (WRITE — now we need the signer → MetaMask opens here)
      setPendingAction("blockchainSignature");
      setMessage("Blockchain signature…");

      const writeContract = getContract(signer);
      const tx      = await writeContract.submitBL(BigInt(shipmentId), hashHex, getBytes(signatureHex));
      const receipt = await tx.wait();

      setShipment((cur) => ({
        ...cur,
        blHash:          normalizeHash(hashHex),
        isValidatedByAI: true,
        status:          Math.max(Number(cur.status ?? 0), 1),
      }));

      const blEventSeen = receipt?.logs?.some((log) => {
        try { return writeContract.interface.parseLog(log)?.name === "BLValidated"; }
        catch { return false; }
      });

      await wait(blEventSeen ? 450 : 700);
      await fetchShipmentFromChain(readContract, shipmentId);

      setMessage(`Bill of Lading submitted for shipment #${shipmentId}.`);
      await onBLSuccess?.({ shipmentId, hashHex, blFile });
    } catch (err) {
      const msg =
        err?.code === 4001
          ? "Transaction rejected in MetaMask."
          : err?.message || "B/L submission failed.";
      setError(msg);
    } finally {
      setPendingAction("");
    }
  };

  // ---------- withdraw ----------

  const withdraw = async ({ withdrawId }) => {
    const targetId = (withdrawId || shipment.id || "").toString();

    if (!signer)    return setError("Connect your wallet first.");
    if (!networkOk) return setError("Wrong network. Switch to Sepolia.");
    if (!targetId || Number(targetId) < 1)
      return setError("Enter a valid shipment ID.");

    setPendingAction("withdraw");
    setError("");
    setMessage("Sending withdrawal…");

    try {
      const contract = getContract(signer);
      const tx       = await contract.withdraw(Number(targetId));
      await tx.wait();

      setWithdrawLocked(true);
      setForceClosedStep(false);
      setShipment((cur) => ({ ...cur, status: 2 }));
      setEscrowBalance("0");
      setPendingAction("");

      window.setTimeout(() => setShowCompletionPopup(true), 150);
      window.setTimeout(async () => {
        setMessage("Withdrawal confirmed.");
        await onWithdrawSuccess?.({ shipmentId: targetId });
      }, 1000);
    } catch (err) {
      const msg =
        err?.code === 4001
          ? "Transaction rejected in MetaMask."
          : err?.message?.toLowerCase().includes("insufficient funds")
          ? "Not enough SepoliaETH for gas."
          : err?.shortMessage || err?.message || "Withdrawal failed.";
      setError(msg);
      setPendingAction("");
    }
  };

  // ---------- reset state when the connected account changes ----------
  // Without this, shipment.id from the previous account stays in state and
  // refresh() reuses it, bypassing the event-based lookup and showing
  // the wrong shipment to the newly connected account.
  useEffect(() => {
    applyShipmentState();
    setEscrowBalance("0");
    setWithdrawLocked(false);
    setForceClosedStep(false);
    setShowCompletionPopup(false);
    setPendingAction("");
    setError("");
    setMessage("");
  }, [account, applyShipmentState]);

  useEffect(() => {
    const previousId = previousShipmentIdRef.current;
    const nextId = shipment.id || "";

    if (nextId && previousId && nextId !== previousId) {
      setWithdrawLocked(false);
      setForceClosedStep(false);
      setShowCompletionPopup(false);
      setPendingAction("");
      setEscrowBalance("0");
      setShipment((cur) => ({
        ...cur,
        status: Number(cur.status) > 1 ? 0 : Number(cur.status ?? 0),
      }));
    }

    previousShipmentIdRef.current = nextId;
  }, [shipment.id]);

  // ---------- on-chain event listener ----------

  useEffect(() => {
    if (!provider || !account) return;
    const contract = getContract(provider);
    if (!contract)  return;

    const handleBLValidated = async (...args) => {
      const validatedId = args[0];
      const id = validatedId?.toString?.() || "";
      if (!id) return;
      setMessage(`Shipment #${id} validated on-chain.`);
      await wait(250);
      await fetchShipmentFromChain(contract, id);
    };

    const handleShipmentCreated = async (...args) => {
      const createdId = args[0];
      const id = createdId?.toString?.() || "";
      if (!id) return;

      const data = await contract.shipments(BigInt(id)).catch(() => null);
      const seller = data?.seller?.toLowerCase?.() || "";
      if (!seller || seller !== account.toLowerCase()) return;

      setMessage(`New shipment #${id} detected.`);
      await prepareNextShipment("", id);
      await wait(150);
      await fetchShipmentFromChain(contract, id);
    };

    contract.on("ShipmentCreated", handleShipmentCreated);
    contract.on("BLValidated", handleBLValidated);
    return () => {
      contract.off("ShipmentCreated", handleShipmentCreated);
      contract.off("BLValidated", handleBLValidated);
    };
  }, [provider, account, fetchShipmentFromChain, prepareNextShipment]);

  return {
    shipment,
    escrowBalance,
    pendingAction,
    loadingContract,
    withdrawLocked,
    forceClosedStep,
    showCompletionPopup,
    error,
    message,
    refresh,
    deposit,
    submitBL,
    withdraw,
    prepareNextShipment,
    handleCompletionPopupClose,
    clearError:   () => setError(""),
    clearMessage: () => setMessage(""),
  };
}
