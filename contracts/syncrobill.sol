// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

contract Syncrobil {
    address public owner;
    address public exporter;

    enum State { Created, Locked, Released, Inactive }

    struct Shipment {
        address buyer;
        address seller;
        uint256 value;
        State state;
        string billOfLadingHash; // L'empreinte numérique du document de transport
    }

    mapping(uint256 => Shipment) public shipments;
    uint256 public shipmentCount;

    event ShipmentCreated(uint256 id, address buyer, uint256 amount);
    event PaymentReleased(uint256 id, address seller, uint256 amount);
    event Withdrawn(address exporter, uint256 amount);

    constructor() {
        owner = msg.sender;
    }

    // View functions for frontend
    function status() external view returns (uint8) {
        return uint8(State.Locked); // Default status
    }

    function escrowBalance() external view returns (uint256) {
        return address(this).balance;
    }

    function blHash() external view returns (string memory) {
        if (shipmentCount > 0) {
            return shipments[shipmentCount].billOfLadingHash;
        }
        return "";
    }

    // Deposit function (payable)
    function deposit(uint256 amount) external payable {
        require(msg.value == amount, "Amount mismatch");
        // Logic handled in createShipment
    }

    // Submit B/L hash
    function submitBL(string memory hash) external {
        if (shipmentCount > 0) {
            shipments[shipmentCount].billOfLadingHash = hash;
        }
    }

    // L'acheteur crée l'expédition et bloque les fonds
    function createShipment(address _seller, string memory _blHash) external payable {
        require(msg.value > 0, "Depot minimum requis");

        if (exporter == address(0)) {
            exporter = _seller;
        }

        shipmentCount++;
        shipments[shipmentCount] = Shipment({
            buyer: msg.sender,
            seller: _seller,
            value: msg.value,
            state: State.Locked,
            billOfLadingHash: _blHash
        });

        emit ShipmentCreated(shipmentCount, msg.sender, msg.value);
    }

    // L'exportateur retire les fonds du contrat (seulement si B/L soumis)
    function withdraw(uint256 _id) external {
        Shipment storage s = shipments[_id];
        require(msg.sender == exporter, "Seul l'exportateur peut retirer");
        require(s.seller == msg.sender, "Identifiant de shipment invalide pour l'exportateur");
        require(bytes(s.billOfLadingHash).length > 0, "B/L non soumis");
        require(s.state == State.Locked, "Etat invalide pour retrait");
        require(address(this).balance > 0, "Pas de fonds disponibles");

        s.state = State.Released;
        uint256 amount = address(this).balance;
        payable(msg.sender).transfer(amount);

        emit PaymentReleased(_id, s.seller, amount);
        emit Withdrawn(msg.sender, amount);
    }

    // Libère l'argent au vendeur (devra être automatisé par un Oracle plus tard)
    function releasePayment(uint256 _id) external {
        Shipment storage s = shipments[_id];
        require(msg.sender == s.buyer, "Seul l'acheteur peut valider");
        require(s.state == State.Locked, "Statut invalide");

        s.state = State.Released;
        payable(s.seller).transfer(s.value);

        emit PaymentReleased(_id, s.seller, s.value);
    }
}