// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/**
 * @title Syncrobil - Trade Finance Escrow with AI Validation
 * @dev Gère le cycle de vie d'une expédition avec vérification de signature par un backend IA.
 *
 * Changement vs version initiale :
 *   - SERVER_SIGNER n'est plus une `constant` gravée dans le bytecode.
 *   - Le owner peut la mettre à jour via setServerSigner() sans redéployer.
 *   - Un event est émis à chaque changement pour garder une trace on-chain.
 */
contract Syncrobil {
    address public owner;

    // Adresse publique du serveur FastAPI autorisé à signer les B/L.
    // Modifiable par le owner sans redéploiement.
    address public serverSigner;

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

    // --- Events ---

    event ShipmentCreated(uint256 indexed id, address indexed buyer, uint256 amount);
    event BLValidated(uint256 indexed id, bytes32 documentHash);
    event PaymentReleased(uint256 indexed id, address indexed seller, uint256 amount);
    event Withdrawn(address indexed exporter, uint256 amount);

    /// @notice Émis chaque fois que le owner met à jour l'adresse du signataire serveur.
    event ServerSignerUpdated(address indexed previousSigner, address indexed newSigner);

    // --- Modifiers ---

    modifier onlyOwner() {
        require(msg.sender == owner, "Seul le proprietaire peut executer ceci");
        _;
    }

    // --- Constructor ---

    /// @param _initialServerSigner Adresse publique correspondant à SYNCROBILL_SIGNER_PRIVATE_KEY.
    constructor(address _initialServerSigner) {
        require(_initialServerSigner != address(0), "Adresse signataire invalide");
        owner = msg.sender;
        serverSigner = _initialServerSigner;
    }

    // --- Admin ---

    /**
     * @notice Met à jour l'adresse du signataire serveur autorisé à valider les B/L.
     * @dev    Appeler cette fonction suffit en cas de rotation de clé — pas de redéploiement.
     * @param  _newSigner Nouvelle adresse publique du serveur FastAPI.
     */
    function setServerSigner(address _newSigner) external onlyOwner {
        require(_newSigner != address(0), "Adresse invalide");
        emit ServerSignerUpdated(serverSigner, _newSigner);
        serverSigner = _newSigner;
    }

    // --- Vue ---

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
     * @dev Soumission du B/L avec vérification cryptographique du serveur IA.
     *      Le contrat relit `serverSigner` à chaque appel — une rotation de clé
     *      prend effet immédiatement sans redéploiement.
     */
    function submitBL(uint256 _id, bytes32 _docHash, bytes memory _signature) external {
        Shipment storage s = shipments[_id];
        require(s.state == State.Locked, "Expedition non active");
        require(msg.sender == s.seller, "Seul le vendeur peut soumettre le B/L");

        // Recréation du hash signé (Standard EIP-191)
        bytes32 messageHash = keccak256(
            abi.encodePacked("\x19Ethereum Signed Message:\n32", _docHash)
        );

        // Extraction de l'adresse du signataire depuis la signature
        address signer = recoverSigner(messageHash, _signature);

        // On compare avec serverSigner (variable, pas constant)
        require(signer == serverSigner, "Signature IA invalide ou non autorisee");

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

        (bool success, ) = payable(s.seller).call{value: amount}("");
        require(success, "Transfert echoue");

        emit PaymentReleased(_id, s.seller, amount);
        emit Withdrawn(msg.sender, amount);
    }

    // --- Outils Cryptographiques (Internes) ---

    function recoverSigner(
        bytes32 _ethSignedMessageHash,
        bytes memory _signature
    ) internal pure returns (address) {
        (bytes32 r, bytes32 s, uint8 v) = splitSignature(_signature);
        return ecrecover(_ethSignedMessageHash, v, r, s);
    }

    function splitSignature(
        bytes memory sig
    ) internal pure returns (bytes32 r, bytes32 s, uint8 v) {
        require(sig.length == 65, "Longueur de signature invalide");
        assembly {
            r := mload(add(sig, 32))
            s := mload(add(sig, 64))
            v := byte(0, mload(add(sig, 96)))
        }
    }

    receive() external payable {}
}