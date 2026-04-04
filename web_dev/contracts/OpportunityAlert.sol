// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "./PortfolioRegistry.sol";
import "./RelationshipRegistry.sol";

contract OpportunityAlert {
    RelationshipRegistry public relationshipRegistry;
    PortfolioRegistry public portfolioRegistry;

    struct Alert {
        address investor;
        bytes32 relationshipId;
        string entityA;
        string entityB;
        string relationshipType;
        string opportunityType;
        uint256 timestamp;
    }

    Alert[] private alerts;
    mapping(address => uint256[]) public investorAlerts;
    mapping(bytes32 => mapping(address => bool)) public emittedForInvestor;

    event CollaborationOpportunityFound(
        address indexed investor,
        bytes32 indexed relationshipId,
        string entityA,
        string entityB,
        string relationshipType,
        string opportunityType,
        uint256 alertId
    );

    constructor(address relationshipRegistryAddress, address portfolioRegistryAddress) {
        require(relationshipRegistryAddress != address(0), "Relationship registry required");
        require(portfolioRegistryAddress != address(0), "Portfolio registry required");

        relationshipRegistry = RelationshipRegistry(relationshipRegistryAddress);
        portfolioRegistry = PortfolioRegistry(portfolioRegistryAddress);
    }

    function checkForOpportunity(
        address investor,
        string memory entityA,
        string memory entityB,
        string memory relationshipType
    ) external returns (bool) {
        require(investor != address(0), "Investor required");
        require(
            relationshipRegistry.relationshipExists(entityA, entityB, relationshipType),
            "Relationship missing"
        );

        bytes32 relationshipId = relationshipRegistry.relationshipIdFor(entityA, entityB, relationshipType);
        if (emittedForInvestor[relationshipId][investor]) {
            return false;
        }

        bool entityAInPortfolio = portfolioRegistry.isEntityInPortfolio(investor, entityA);
        bool entityBInPortfolio = portfolioRegistry.isEntityInPortfolio(investor, entityB);

        if (!(entityAInPortfolio && entityBInPortfolio)) {
            return false;
        }

        uint256 alertId = alerts.length;
        alerts.push(
            Alert({
                investor: investor,
                relationshipId: relationshipId,
                entityA: entityA,
                entityB: entityB,
                relationshipType: relationshipType,
                opportunityType: "PORTFOLIO_CROSSOVER",
                timestamp: block.timestamp
            })
        );

        emittedForInvestor[relationshipId][investor] = true;
        investorAlerts[investor].push(alertId);

        emit CollaborationOpportunityFound(
            investor,
            relationshipId,
            entityA,
            entityB,
            relationshipType,
            "PORTFOLIO_CROSSOVER",
            alertId
        );

        return true;
    }

    function getAlertCount() external view returns (uint256) {
        return alerts.length;
    }

    function getAlert(uint256 alertId) external view returns (Alert memory) {
        require(alertId < alerts.length, "Alert missing");
        return alerts[alertId];
    }

    function getInvestorAlerts(address investor) external view returns (uint256[] memory) {
        return investorAlerts[investor];
    }
}
