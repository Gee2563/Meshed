import type { InterfaceAbi } from "ethers";

export const verifiedInteractionRegistryAbi = [
  "function recordInteraction((bytes32 interactionId,uint8 interactionType,bytes32 actorRef,bytes32 targetRef,bytes32 companyRef,bytes32 painPointRef,uint32 matchScoreBps,bool verified,uint8 rewardStatus,bytes32 metadataHash) input) external returns (bytes32)",
  "function interactionExists(bytes32 interactionId) external view returns (bool)",
  "event InteractionRecorded(bytes32 indexed interactionId,uint8 indexed interactionType,bytes32 indexed actorRef,bytes32 targetRef,bytes32 companyRef,bytes32 painPointRef,uint32 matchScoreBps,bool verified,uint8 rewardStatus,bytes32 metadataHash,address recorder,uint256 recordedAt)",
] satisfies InterfaceAbi;
