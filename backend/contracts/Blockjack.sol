// SPDX-License-Identifier: MIT

pragma solidity ^0.8.24;

contract Blockjack {
    struct Game {
        uint8[] cardsForDealer;
        uint8[] cardsForPlayer;
        uint8[] deck;
        State state;
    }

    enum State {
        Uninitialized,
        DealerWins,
        PlayerWins,
        Tie,
        Waiting
    }

    event CardsChangedForDealer(address indexed game, uint8[] cards);
    event CardsChangedForPlayer(address indexed game, uint8[] cards);
    event StateChanged(address indexed game, State state);

    mapping(address => Game) _games;

    function createGame() public {
        Game storage game = _games[msg.sender];

        require(game.state == State.Uninitialized, "Illegal state");

        while (game.deck.length < 8) {
            game.deck.push(_randomCard(game.deck.length));
        }

        _dealPlayer(game, 2);

        if (_rateCards(game.cardsForPlayer) == 21) {
            _setStatus(game, State.PlayerWins);
            return;
        }

        _dealDealer(game, 2);

        if (_rateCards(game.cardsForDealer) == 21) {
            _setStatus(game, State.DealerWins);
            return;
        }

        _setStatus(game, State.Waiting);
    }

    function _dealDealer(Game storage game, uint8 count) private {
        for (; count > 0; count--) {
            game.cardsForDealer.push(game.deck[game.deck.length - 1]);

            game.deck.pop();
        }

        emit CardsChangedForDealer(msg.sender, game.cardsForDealer);
    }

    function _dealPlayer(Game storage game, uint8 count) private {
        for (; count > 0; count--) {
            game.cardsForPlayer.push(game.deck[game.deck.length - 1]);

            game.deck.pop();
        }

        emit CardsChangedForPlayer(msg.sender, game.cardsForPlayer);
    }

    function deleteGame() public {
        delete _games[msg.sender];
    }

    function draw() public {
        Game storage game = _games[msg.sender];

        require(game.state == State.Waiting, "Illegal state");

        _dealPlayer(game, 1);

        if (_rateCards(game.cardsForPlayer) > 21) {
            _setStatus(game, State.DealerWins);
        }
    }

    function getGame() public view returns (Game memory) {
        return _games[msg.sender];
    }

    function _randomCard(uint256 seed) private view returns (uint8) {
        uint256 value = uint256(keccak256(abi.encodePacked(seed, block.timestamp, block.prevrandao, msg.sender)));

        return uint8((value % 9) + 6);
    }

    function _rateCard(uint8 card) private pure returns (uint8) {
        if (card < 11) {
            return card;
        } else if (card < 14) {
            return 10;
        } else {
            return 11;
        }
    }

    function _rateCards(uint8[] memory cards) private pure returns (uint8) {
        uint8 total;

        for (uint8 index = 0; index < cards.length; index++) {
            total += _rateCard(cards[index]);
        }

        return total;
    }

    function _setStatus(Game storage game, State state) private {
        emit StateChanged(msg.sender, state);

        game.state = state;
    }

    function stand() public {
        Game storage game = _games[msg.sender];

        require(game.state == State.Waiting, "Illegal state");

        while (_rateCards(game.cardsForDealer) < 17) {
            _dealDealer(game, 1);
        }

        uint8 scoreForDealer = _rateCards(game.cardsForDealer);

        if (scoreForDealer > 21) {
            _setStatus(game, State.PlayerWins);
            return;
        }

        uint8 scoreForPlayer = _rateCards(game.cardsForPlayer);

        if (scoreForPlayer > scoreForDealer) {
            _setStatus(game, State.PlayerWins);
        } else if (scoreForPlayer < scoreForDealer) {
            _setStatus(game, State.DealerWins);
        } else {
            _setStatus(game, State.Tie);
        }
    }
}
