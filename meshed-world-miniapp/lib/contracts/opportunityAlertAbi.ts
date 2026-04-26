export const opportunityAlertAbi = [
  "function checkForOpportunity(address investor,string entityA,string entityB,string relationshipType) returns (bool)",
  "function getInvestorAlerts(address investor) view returns (uint256[] memory)",
  "function getAlert(uint256 alertId) view returns (tuple(address investor, bytes32 relationshipId, string entityA, string entityB, string relationshipType, string opportunityType, uint256 timestamp))",
] as const;
