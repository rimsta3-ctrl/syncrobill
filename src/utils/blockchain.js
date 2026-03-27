import { BrowserProvider, Contract } from "ethers";
import syncrobilArtifact from "../../artifacts/contracts/syncrobill.sol/Syncrobil.json";

export const CONTRACT_ADDRESS =
  import.meta.env.VITE_CONTRACT_ADDRESS || "0x5FbDB2315678afecb367f032d93F642f64180aa3";
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

const abi = syncrobilArtifact.abi;

export function getProvider() {
  if (!window.ethereum) return null;
  return new BrowserProvider(window.ethereum);
}

export function getContract(providerOrSigner) {
  return new Contract(CONTRACT_ADDRESS, abi, providerOrSigner);
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
