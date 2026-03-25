import hre from "hardhat";

async function main() {
  console.log("Déploiement du contrat Syncrobil en cours...");

  const Syncrobil = await hre.ethers.getContractFactory("Syncrobil");
  const syncrobil = await Syncrobil.deploy();

  await syncrobil.waitForDeployment();

  const address = await syncrobil.getAddress();
  console.log("------------------------------------------");
  console.log("SUCCÈS ! Syncrobil déployé à :", address);
  console.log("------------------------------------------");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});