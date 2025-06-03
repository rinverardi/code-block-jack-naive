// SPDX-License-Identifier: MIT

pragma solidity ^0.8.24;

import "./Blockjack.sol";

contract TestableBlockjack is Blockjack {
    function plantDeck(uint8[] memory deck) public {
        _games[msg.sender].deck = deck;
    }
}
