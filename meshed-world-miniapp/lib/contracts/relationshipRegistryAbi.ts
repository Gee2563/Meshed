export const relationshipRegistryAbi = [
  "function recordRelationship(string entityA,string entityB,string relationshipType) returns (bytes32)",
  "function relationshipExists(string entityA,string entityB,string relationshipType) view returns (bool)",
  "function relationshipIdFor(string entityA,string entityB,string relationshipType) pure returns (bytes32)",
] as const;
