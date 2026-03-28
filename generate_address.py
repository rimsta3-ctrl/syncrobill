import os
import sys
from eth_account import Account
from dotenv import load_dotenv

# Charge les variables du fichier .env
load_dotenv()

def main():
    # Récupère la clé depuis le fichier .env
    private_key = os.getenv("SYNCROBILL_SIGNER_PRIVATE_KEY")
    
    if not private_key:
        print("ERREUR : La variable SYNCROBILL_SIGNER_PRIVATE_KEY est introuvable dans le fichier .env")
        return 1

    try:
        # Nettoyage et génération
        account = Account.from_key(private_key.strip())
        print(f"\n[SUCCESS] Clé chargée depuis .env")
        print(f"ADRESSE PUBLIQUE : {account.address}")
        return 0
    except Exception as exc:
        print(f"ERREUR : Clé privée invalide dans le .env : {exc}")
        return 1

if __name__ == "__main__":
    sys.exit(main())