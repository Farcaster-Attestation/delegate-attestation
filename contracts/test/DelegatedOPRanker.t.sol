// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import {Test} from "forge-std/Test.sol";
import {DelegatedOPRanker} from "../src/DelegatedOPRanker.sol";

contract MockDelegatedOP {
    mapping(address => uint256) private votes;

    function setVotes(address account, uint256 amount) external {
        votes[account] = amount;
    }

    function getVotes(address account) external view returns (uint256) {
        return votes[account];
    }
}

contract DelegatedOPRankerTest is Test {
    DelegatedOPRanker public ranker;
    MockDelegatedOP public mockDelegatedOP;
    address public alice = makeAddr("alice");
    address public bob = makeAddr("bob");
    address public charlie = makeAddr("charlie");
    address public dave = makeAddr("dave");
    address public eve = makeAddr("eve");

    function setUp() public {
        mockDelegatedOP = new MockDelegatedOP();
        ranker = new DelegatedOPRanker(address(mockDelegatedOP), 4); // Set max ranks to 4
    }

    function test_InitialState() public {
        assertEq(ranker.delegatedOP(), address(mockDelegatedOP));
        assertEq(ranker.maxRanks(), 4);
        assertEq(ranker.getRank(alice), 0); // Alice rank doesn't exists
    }

    function test_UpdateRank() public {
        // Set up initial votes
        mockDelegatedOP.setVotes(alice, 100);
        mockDelegatedOP.setVotes(bob, 200);
        mockDelegatedOP.setVotes(charlie, 300);
        mockDelegatedOP.setVotes(dave, 150);

        // Update ranks
        ranker.updateRank(alice);

        // Check ranks
        assertEq(ranker.getRank(alice), 1);

        ranker.updateRank(bob);

        // Check ranks
        assertEq(ranker.getRank(bob), 1);
        assertEq(ranker.getRank(alice), 2);

        ranker.updateRank(charlie);

        // Check ranks
        assertEq(ranker.getRank(charlie), 1); // Highest votes
        assertEq(ranker.getRank(bob), 2); // Second highest
        assertEq(ranker.getRank(alice), 3); // Third highest

        ranker.updateRank(dave);

        // Check ranks
        assertEq(ranker.getRank(charlie), 1); // Highest votes
        assertEq(ranker.getRank(bob), 2); // Second highest
        assertEq(ranker.getRank(dave), 3); // Third highest
        assertEq(ranker.getRank(alice), 4); // Fourth highest

        // Update votes and check rank changes
        mockDelegatedOP.setVotes(alice, 400); // Alice now has highest votes
        ranker.updateRank(alice);

        assertEq(ranker.getRank(alice), 1); // Now highest
        assertEq(ranker.getRank(charlie), 2); // Moved down
        assertEq(ranker.getRank(bob), 3); // Moved down
        assertEq(ranker.getRank(dave), 4); // Moved down
    }

    function test_RankTooLow() public {
        // Set up votes for max ranks
        mockDelegatedOP.setVotes(alice, 100);
        mockDelegatedOP.setVotes(bob, 200);
        mockDelegatedOP.setVotes(charlie, 300);
        mockDelegatedOP.setVotes(eve, 75);
        mockDelegatedOP.setVotes(dave, 50); // Dave has lowest votes

        // Fill up the ranks
        ranker.updateRank(alice);
        ranker.updateRank(bob);
        ranker.updateRank(charlie);
        ranker.updateRank(eve);

        // Try to update Dave's rank - should revert
        vm.expectRevert(DelegatedOPRanker.RankTooLow.selector);
        ranker.updateRank(dave);
    }

    function test_UpdateRankWithSameVotes() public {
        // Set same votes for multiple accounts
        mockDelegatedOP.setVotes(alice, 100);
        mockDelegatedOP.setVotes(bob, 100);
        mockDelegatedOP.setVotes(charlie, 100);

        // Update ranks
        ranker.updateRank(alice);
        ranker.updateRank(bob);
        ranker.updateRank(charlie);

        // Check that they maintain their order of insertion
        assertEq(ranker.getRank(alice), 1);
        assertEq(ranker.getRank(bob), 2);
        assertEq(ranker.getRank(charlie), 3);
    }
}
