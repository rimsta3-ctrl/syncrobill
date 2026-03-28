// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/**
 * @title Syncrobil - Trade Finance Escrow with AI Validation
 * @dev Gère le cycle de vie d'une expédition avec vérification de signature par un backend IA.
 */
contract Syncrobil {
    address public owner;
    
    // L'ADRESSE PUBLIQUE DE TON SERVEUR FASTAPI
    // Correspond à la clé privée SYNCROBILL_SIGNER_PRIVATE_KEY (0x7704...)
    address public constant SERVER_SIGNER = 0xe8C9AbBf6ee89921140115f1BaE5c8feC3aF1A57;

    enum State { Created, Locked, Released, Inactive }

    struct Shipment {
        address buyer;
        address seller;
        uint256 value;
        State state;
        bytes32 billOfLadingHash; 
        bool isValidatedByAI;
    }

    mapping(uint256 => Shipment) public shipments;
    uint256 public shipmentCount;

    event ShipmentCreated(uint256 id, address buyer, uint256 amount);
    event BLValidated(uint256 id, bytes32 documentHash);
    event PaymentReleased(uint256 id, address seller, uint256 amount);
    event Withdrawn(address exporter, uint256 amount);

    modifier onlyOwner() {
        // Correction : "proprietaire" sans accent pour éviter l'erreur Unicode
        require(msg.sender == owner, "Seul le proprietaire peut executer ceci");
        _;
    }

    constructor() {
        owner = msg.sender;
    }

    // --- Fonctions de Vue ---

    function escrowBalance() external view returns (uint256) {
        return address(this).balance;
    }

    function getShipmentHash(uint256 _id) external view returns (bytes32) {
        return shipments[_id].billOfLadingHash;
    }

    // --- Logique métier ---

    /**
     * @dev L'acheteur crée l'expédition et bloque les fonds.
     */
    function createShipment(address _seller) external payable {
        require(msg.value > 0, "Depot minimum requis");
        require(_seller != address(0), "Adresse vendeur invalide");

        shipmentCount++;
        shipments[shipmentCount] = Shipment({
            buyer: msg.sender,
            seller: _seller,
            value: msg.value,
            state: State.Locked,
            billOfLadingHash: bytes32(0),
            isValidatedByAI: false
        });

        emit ShipmentCreated(shipmentCount, msg.sender, msg.value);
    }

    /**
     * @dev Soumission du B/L avec vérification cryptographique de l'IA.
     */
    function submitBL(uint256 _id, bytes32 _docHash, bytes memory _signature) external {
        Shipment storage s = shipments[_id];
        require(s.state == State.Locked, "Expedition non active");
        require(msg.sender == s.seller, "Seul le vendeur peut soumettre le B/L");

        // Recréation du hash signé (Standard Ethereum)
        bytes32 messageHash = keccak256(abi.encodePacked("\x19Ethereum Signed Message:\n32", _docHash));
        
        // Extraction de l'adresse du signataire depuis la signature
        address signer = recoverSigner(messageHash, _signature);

        require(signer == SERVER_SIGNER, "Signature IA invalide ou non autorisee");

        s.billOfLadingHash = _docHash;
        s.isValidatedByAI = true;

        emit BLValidated(_id, _docHash);
    }

    /**
     * @dev Le vendeur retire les fonds si l'IA a validé.
     */
    function withdraw(uint256 _id) external {
        Shipment storage s = shipments[_id];
        
        require(msg.sender == s.seller, "Seul le vendeur peut retirer");
        require(s.isValidatedByAI == true, "Document non valide par l'IA");
        require(s.state == State.Locked, "Fonds deja liberes ou inactifs");

        s.state = State.Released;
        uint256 amount = s.value;
        
        // Transfert sécurisé des fonds
        (bool success, ) = payable(s.seller).call{value: amount}("");
        require(success, "Transfert echoue");

        emit PaymentReleased(_id, s.seller, amount);
        emit Withdrawn(msg.sender, amount);
    }

    // --- Outils Cryptographiques (Internes) ---

    function recoverSigner(bytes32 _ethSignedMessageHash, bytes memory _signature) internal pure returns (address) {
        (bytes32 r, bytes32 s, uint8 v) = splitSignature(_signature);
        return ecrecover(_ethSignedMessageHash, v, r, s);
    }

    function splitSignature(bytes memory sig) internal pure returns (bytes32 r, bytes32 s, uint8 v) {
        require(sig.length == 65, "Longueur de signature invalide");
        assembly {
            r := mload(add(sig, 32))
            s := mload(add(sig, 64))
            v := byte(0, mload(add(sig, 96)))
        }
    }

    receive() external payable {}
}
