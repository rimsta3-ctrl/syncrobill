Syncrobill - Blockchain Trade Finance Terminal
Syncrobill est une plateforme de financement du commerce international exploitant la technologie blockchain pour sécuriser les transactions entre exportateurs, importateurs et transporteurs. Le système repose sur des contrats intelligents auto-exécutants qui garantissent le paiement une fois les conditions logistiques remplies.

Fonctionnalités principales
Gestion des dépôts en séquestre (Escrow) : Les fonds sont immobilisés dans le contrat intelligent dès l'initiation de la commande.

Validation multi-parties : Le déblocage des fonds nécessite la confirmation de la livraison ou la soumission de documents de transport valides.

Transparence immuable : Toutes les étapes de la transaction sont enregistrées sur le réseau Ethereum Sepolia, empêchant toute modification rétroactive des données.

Interface de contrôle : Un terminal interactif permet de suivre le statut de l'expédition et d'interagir avec le portefeuille MetaMask.

Prérequis techniques
Node.js (version 18 ou supérieure)

Portefeuille MetaMask configuré sur le réseau de test Sepolia

Solde en Sepolia ETH pour couvrir les frais de gaz
--shell 
Installation
Installation des dépendances :
npm install --legacy-peer-deps

Configuration de l'environnement :
Créez un fichier nommé .env à la racine du projet et renseignez les variables suivantes :
VITE_RPC_URL=votre_url_rpc_infura_ou_alchemy
VITE_PRIVATE_KEY=votre_cle_privee_metamask

Déploiement du Smart Contract
Pour déployer le contrat sur le réseau Sepolia, utilisez la commande suivante :

npx hardhat run scripts/deploy.js --network sepolia

Une fois le déploiement terminé, notez l'adresse du contrat affichée dans le terminal pour l'intégrer à votre interface frontend.

Lancement du Frontend
Pour démarrer le serveur de développement local :

npm run dev

L'application sera accessible par défaut à l'adresse http://localhost:5173.

Architecture du Projet
Smart Contracts : Développés en Solidity et gérés via Hardhat.

Frontend : Développé avec React.js, Vite et Tailwind CSS.

Intégration Web3 : Utilisation de la bibliothèque Ethers.js pour la communication entre l'interface utilisateur et la blockchain Ethereum.
