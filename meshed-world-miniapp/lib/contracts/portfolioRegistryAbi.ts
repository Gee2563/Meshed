export const portfolioRegistryAbi = [
  "function registerPortfolio(string[] companies,string[] founders)",
  "function getCompanies(address investor) view returns (string[] memory)",
  "function getFounders(address investor) view returns (string[] memory)",
  "function isEntityInPortfolio(address investor,string entity) view returns (bool)",
] as const;
