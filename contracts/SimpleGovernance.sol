// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";

interface ICameraFeeController {
    function setRegistrationFee(uint256 newFee) external;
}

contract SimpleGovernance is Ownable {
    struct Proposal {
        uint256 id;
        string description;
        uint256 newRegistrationFee;
        uint256 yesVotes;
        uint256 noVotes;
        uint256 deadline;
        bool executed;
    }

    IERC20 public immutable governanceToken;
    ICameraFeeController public immutable cameraNFT;
    uint256 public nextProposalId;
    uint256 public immutable votingPeriod;

    mapping(uint256 => Proposal) public proposals;
    mapping(uint256 => mapping(address => bool)) public hasVoted;

    event ProposalCreated(uint256 indexed proposalId, string description, uint256 newRegistrationFee, uint256 deadline);
    event Voted(uint256 indexed proposalId, address indexed voter, bool support, uint256 weight);
    event ProposalExecuted(uint256 indexed proposalId, uint256 newRegistrationFee);

    constructor(address initialOwner, address tokenAddress, address cameraNFTAddress, uint256 votingPeriodSeconds)
        Ownable(initialOwner)
    {
        governanceToken = IERC20(tokenAddress);
        cameraNFT = ICameraFeeController(cameraNFTAddress);
        votingPeriod = votingPeriodSeconds;
    }

    function createProposal(string calldata description, uint256 newRegistrationFee) external returns (uint256) {
        require(governanceToken.balanceOf(msg.sender) > 0, "No governance power");

        uint256 proposalId = ++nextProposalId;
        proposals[proposalId] = Proposal({
            id: proposalId,
            description: description,
            newRegistrationFee: newRegistrationFee,
            yesVotes: 0,
            noVotes: 0,
            deadline: block.timestamp + votingPeriod,
            executed: false
        });

        emit ProposalCreated(proposalId, description, newRegistrationFee, block.timestamp + votingPeriod);
        return proposalId;
    }

    function vote(uint256 proposalId, bool support) external {
        Proposal storage proposal = proposals[proposalId];
        require(proposal.id != 0, "Proposal not found");
        require(block.timestamp <= proposal.deadline, "Voting closed");
        require(!hasVoted[proposalId][msg.sender], "Already voted");

        uint256 weight = governanceToken.balanceOf(msg.sender);
        require(weight > 0, "No voting power");

        hasVoted[proposalId][msg.sender] = true;

        if (support) {
            proposal.yesVotes += weight;
        } else {
            proposal.noVotes += weight;
        }

        emit Voted(proposalId, msg.sender, support, weight);
    }

    function executeProposal(uint256 proposalId) external {
        Proposal storage proposal = proposals[proposalId];
        require(proposal.id != 0, "Proposal not found");
        require(block.timestamp > proposal.deadline, "Voting ongoing");
        require(!proposal.executed, "Already executed");
        require(proposal.yesVotes > proposal.noVotes, "Proposal rejected");

        proposal.executed = true;
        cameraNFT.setRegistrationFee(proposal.newRegistrationFee);

        emit ProposalExecuted(proposalId, proposal.newRegistrationFee);
    }
}
