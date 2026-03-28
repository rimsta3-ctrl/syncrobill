import { BrowserProvider, Contract } from "ethers";
import { CONTRACT_ADDRESS, RESOLVED_CONTRACT_ABI } from "../constants";

export const EXPECTED_CHAIN_ID = 11155111n;
export const EXPECTED_CHAIN_ID_HEX = "0xaa36a7";
export const SEPOLIA_NETWORK_CONFIG = {
  chainId: EXPECTED_CHAIN_ID_HEX,
  chainName: "Sepolia",
  nativeCurrency: {
    name: "Sepolia Ether",
    symbol: "SEP",
    decimals: 18,
  },
  rpcUrls: import.meta.env.VITE_RPC_URL ? [import.meta.env.VITE_RPC_URL] : [],
  blockExplorerUrls: ["https://sepolia.etherscan.io"],
};

export function getProvider() {
  if (!window.ethereum) return null;
  return new BrowserProvider(window.ethereum);
}

export function getContract(providerOrSigner) {
  if (!Array.isArray(RESOLVED_CONTRACT_ABI) || RESOLVED_CONTRACT_ABI.length === 0) {
    throw new Error("Syncrobill ABI is missing or malformed.");
  }

  return new Contract(CONTRACT_ADDRESS, RESOLVED_CONTRACT_ABI, providerOrSigner);
}

export async function getChainId(provider) {
  const network = await provider.getNetwork();
  return network.chainId;
}

export async function ensureSepoliaNetwork() {
  if (!window.ethereum) return false;

  try {
    await window.ethereum.request({
      method: "wallet_switchEthereumChain",
      params: [{ chainId: EXPECTED_CHAIN_ID_HEX }],
    });
    return true;
  } catch (error) {
    if (error?.code === 4902) {
      await window.ethereum.request({
        method: "wallet_addEthereumChain",
        params: [SEPOLIA_NETWORK_CONFIG],
      });
      return true;
    }

    throw error;
  }
}
