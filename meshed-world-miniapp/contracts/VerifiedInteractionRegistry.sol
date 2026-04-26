// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/access/Ownable.sol";

contract VerifiedInteractionRegistry is Ownable {
    struct InteractionRecordInput {
        bytes32 interactionId;
        uint8 interactionType;
        bytes32 actorRef;
        bytes32 targetRef;
        bytes32 companyRef;
        bytes32 painPointRef;
        uint32 matchScoreBps;
        bool verified;
        uint8 rewardStatus;
        bytes32 metadataHash;
    }

    struct InteractionRecord {
        uint8 interactionType;
        bytes32 actorRef;
        bytes32 targetRef;
        bytes32 companyRef;
        bytes32 painPointRef;
        uint32 matchScoreBps;
        bool verified;
        uint8 rewardStatus;
        bytes32 metadataHash;
        uint256 recordedAt;
        address recorder;
    }

    mapping(bytes32 => InteractionRecord) public interactions;

    event InteractionRecorded(
        bytes32 indexed interactionId,
        uint8 indexed interactionType,
        bytes32 indexed actorRef,
        bytes32 targetRef,
        bytes32 companyRef,
        bytes32 painPointRef,
        uint32 matchScoreBps,
        bool verified,
        uint8 rewardStatus,
        bytes32 metadataHash,
        address recorder,
        uint256 recordedAt
    );

    constructor(address initialOwner) Ownable(initialOwner) {}

    function recordInteraction(InteractionRecordInput calldata input) external onlyOwner returns (bytes32) {
        require(input.interactionId != bytes32(0), "Interaction ID required");
        require(interactions[input.interactionId].recordedAt == 0, "Interaction already recorded");

        interactions[input.interactionId] = InteractionRecord({
            interactionType: input.interactionType,
            actorRef: input.actorRef,
            targetRef: input.targetRef,
            companyRef: input.companyRef,
            painPointRef: input.painPointRef,
            matchScoreBps: input.matchScoreBps,
            verified: input.verified,
            rewardStatus: input.rewardStatus,
            metadataHash: input.metadataHash,
            recordedAt: block.timestamp,
            recorder: msg.sender
        });

        emit InteractionRecorded(
            input.interactionId,
            input.interactionType,
            input.actorRef,
            input.targetRef,
            input.companyRef,
            input.painPointRef,
            input.matchScoreBps,
            input.verified,
            input.rewardStatus,
            input.metadataHash,
            msg.sender,
            block.timestamp
        );

        return input.interactionId;
    }

    function interactionExists(bytes32 interactionId) external view returns (bool) {
        return interactions[interactionId].recordedAt != 0;
    }
}
