// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/access/Ownable.sol";

contract RelationshipRegistry is Ownable {
    struct Relationship {
        string entityA;
        string entityB;
        string relationshipType;
        uint256 timestamp;
        bool verified;
    }

    mapping(bytes32 => Relationship) public relationships;
    address public attestationOracle;

    event AttestationOracleUpdated(address indexed previousOracle, address indexed nextOracle);
    event RelationshipRecorded(
        bytes32 indexed relationshipId,
        string entityA,
        string entityB,
        string relationshipType,
        uint256 timestamp
    );

    modifier onlyOracle() {
        require(msg.sender == attestationOracle, "Not authorized");
        _;
    }

    constructor(address initialOwner, address initialOracle) Ownable(initialOwner) {
        require(initialOracle != address(0), "Oracle required");
        attestationOracle = initialOracle;
        emit AttestationOracleUpdated(address(0), initialOracle);
    }

    function setAttestationOracle(address newOracle) external onlyOwner {
        require(newOracle != address(0), "Oracle required");

        address previousOracle = attestationOracle;
        attestationOracle = newOracle;
        emit AttestationOracleUpdated(previousOracle, newOracle);
    }

    function relationshipIdFor(
        string memory entityA,
        string memory entityB,
        string memory relationshipType
    ) public pure returns (bytes32) {
        return keccak256(abi.encode(entityA, entityB, relationshipType));
    }

    function recordRelationship(
        string memory entityA,
        string memory entityB,
        string memory relationshipType
    ) external onlyOracle returns (bytes32 relationshipId) {
        relationshipId = relationshipIdFor(entityA, entityB, relationshipType);

        relationships[relationshipId] = Relationship({
            entityA: entityA,
            entityB: entityB,
            relationshipType: relationshipType,
            timestamp: block.timestamp,
            verified: true
        });

        emit RelationshipRecorded(relationshipId, entityA, entityB, relationshipType, block.timestamp);
    }

    function relationshipExists(
        string memory entityA,
        string memory entityB,
        string memory relationshipType
    ) public view returns (bool) {
        bytes32 relationshipId = relationshipIdFor(entityA, entityB, relationshipType);
        return relationships[relationshipId].verified;
    }
}
