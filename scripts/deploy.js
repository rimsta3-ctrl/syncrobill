import hre from "hardhat";
import * as dotenv from "dotenv";
import { fileURLToPath } from "url";
import { dirname, resolve } from "path";

// Lire .env.deploy — pas le .env Vite
const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: resolve(__dirname, "../.env.deploy") });

async function main() {
  // L'adresse publique du serveur FastAPI (SYNCROBILL_SIGNER_PRIVATE_KEY dans .env du backend)
  const serverSigner = process.env.DEPLOY_SERVER_SIGNER;

  if (!serverSigner || !serverSigner.startsWith("0x")) {
    throw new Error(
      "DEPLOY_SERVER_SIGNER manquant dans .env.deploy. " +
      "Lance generate_address.py pour obtenir l'adresse publique de ta clé serveur."
    );
  }

  console.log("Deploying Syncrobil contract...");
  console.log(`  Server signer : ${serverSigner}`);

  const Syncrobil = await hre.ethers.getContractFactory("Syncrobil");
  const syncrobil = await Syncrobil.deploy(serverSigner);

  await syncrobil.waitForDeployment();

  const address = await syncrobil.getAddress();
  console.log(`\nCONTRAT DEPLOYE : ${address}`);
  console.log(`\nAjouter dans .env :`);
  console.log(`  VITE_CONTRACT_ADDRESS=${address}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});