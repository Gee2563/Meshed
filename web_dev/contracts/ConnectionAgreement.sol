// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

contract ConnectionAgreement {
    address public participantA;
    address public participantB;
    string public connectionType;
    string public message;
    uint256 public connectedAt;

    event ConnectionActivated(
        address indexed participantA,
        address indexed participantB,
        string connectionType,
        string message,
        uint256 connectedAt
    );

    constructor(
        address initialParticipantA,
        address initialParticipantB,
        string memory initialConnectionType,
        string memory initialMessage
    ) {
        require(initialParticipantA != address(0), "Participant A required");
        require(initialParticipantB != address(0), "Participant B required");
        require(initialParticipantA != initialParticipantB, "Distinct participants required");

        participantA = initialParticipantA;
        participantB = initialParticipantB;
        connectionType = initialConnectionType;
        message = initialMessage;
        connectedAt = block.timestamp;

        emit ConnectionActivated(
            initialParticipantA,
            initialParticipantB,
            initialConnectionType,
            initialMessage,
            connectedAt
        );
    }
}
