// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

contract PortfolioRegistry {
    struct Portfolio {
        address investor;
        string[] companies;
        string[] founders;
    }

    mapping(address => Portfolio) private portfolios;

    event PortfolioUpdated(address indexed investor, uint256 companyCount, uint256 founderCount);

    function registerPortfolio(string[] memory companies, string[] memory founders) external {
        portfolios[msg.sender] = Portfolio({
            investor: msg.sender,
            companies: companies,
            founders: founders
        });

        emit PortfolioUpdated(msg.sender, companies.length, founders.length);
    }

    function getPortfolio(address investor) external view returns (Portfolio memory) {
        return portfolios[investor];
    }

    function getCompanies(address investor) external view returns (string[] memory) {
        return portfolios[investor].companies;
    }

    function getFounders(address investor) external view returns (string[] memory) {
        return portfolios[investor].founders;
    }

    function isEntityInPortfolio(address investor, string memory entity) external view returns (bool) {
        Portfolio storage portfolio = portfolios[investor];
        return _isInArray(entity, portfolio.companies) || _isInArray(entity, portfolio.founders);
    }

    function _isInArray(string memory target, string[] storage arr) internal view returns (bool) {
        bytes32 targetHash = keccak256(bytes(target));
        for (uint256 i = 0; i < arr.length; i++) {
            if (keccak256(bytes(arr[i])) == targetHash) {
                return true;
            }
        }
        return false;
    }
}
