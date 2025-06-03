import { expect } from "chai";
import { Signer } from "ethers";
import { ethers } from "hardhat";

import { TestableBlockjack } from "../../types";

const [J, Q, K, A] = [11, 12, 13, 14];

enum State {
  Uninitialized,
  DealerWins,
  PlayerWins,
  Tie,
  Waiting,
}

describe("Blockjack", function () {
  let player: Signer;

  let viaOwner: TestableBlockjack;
  let viaPlayer: TestableBlockjack;

  beforeEach(async function () {
    const factory = await ethers.getContractFactory("TestableBlockjack");

    player = (await ethers.getSigners())[1];

    viaOwner = await factory.deploy();
    viaPlayer = viaOwner.connect(player);
  });

  it("create game", async function () {
    await viaPlayer.plantDeck([0, 0, 0, 0, 9, 8, 7, 6]);

    const transaction = await viaPlayer.createGame();

    await expect(transaction).to.emit(viaPlayer, "CardsChangedForPlayer").withArgs(player, [6, 7]);
    await expect(transaction).to.emit(viaPlayer, "CardsChangedForDealer").withArgs(player, [8, 9]);
    await expect(transaction).to.emit(viaPlayer, "StateChanged").withArgs(player, State.Waiting);

    const game = await viaPlayer.getGame();

    expect(game.cardsForPlayer).to.deep.eq([6, 7]);
    expect(game.cardsForDealer).to.deep.eq([8, 9]);
    expect(game.state).to.eq(State.Waiting);
  });

  it("create game again", async function () {
    await viaOwner.createGame();

    await expect(viaOwner.createGame()).to.be.revertedWith("Illegal state");
  });

  it("dealer busts", async function () {
    await viaPlayer.plantDeck([0, 0, 0, 9, 8, 7, 8, 7]);
    await viaPlayer.createGame();

    const transaction = await viaPlayer.stand();

    await expect(transaction).to.emit(viaPlayer, "CardsChangedForDealer").withArgs(player, [7, 8, 9]);
    await expect(transaction).to.emit(viaPlayer, "StateChanged").withArgs(player, State.PlayerWins);

    const game = await viaPlayer.getGame();

    expect(game.cardsForPlayer).to.deep.eq([7, 8]);
    expect(game.cardsForDealer).to.deep.eq([7, 8, 9]);
    expect(game.state).to.eq(State.PlayerWins);
  });

  it("dealer wins", async function () {
    await viaPlayer.plantDeck([0, 0, 0, 0, Q, J, 9, 8]);
    await viaPlayer.createGame();

    const transaction = await viaPlayer.stand();

    await expect(transaction).to.emit(viaPlayer, "StateChanged").withArgs(player, State.DealerWins);

    const game = await viaPlayer.getGame();

    expect(game.cardsForPlayer).to.deep.eq([8, 9]);
    expect(game.cardsForDealer).to.deep.eq([J, Q]);
    expect(game.state).to.eq(State.DealerWins);
  });

  it("dealer wins early (Blockjack)", async function () {
    await viaPlayer.plantDeck([0, 0, 0, 0, A, K, 7, 6]);

    const transaction = await viaPlayer.createGame();

    await expect(transaction).to.emit(viaPlayer, "CardsChangedForPlayer").withArgs(player, [6, 7]);
    await expect(transaction).to.emit(viaPlayer, "CardsChangedForDealer").withArgs(player, [K, A]);
    await expect(transaction).to.emit(viaPlayer, "StateChanged").withArgs(player, State.DealerWins);

    const game = await viaPlayer.getGame();

    expect(game.cardsForPlayer).to.deep.eq([6, 7]);
    expect(game.cardsForDealer).to.deep.eq([K, A]);
    expect(game.state).to.eq(State.DealerWins);
  });

  it("dealer wins late", async function () {
    await viaPlayer.plantDeck([0, 0, 0, 8, 7, 6, Q, J]);
    await viaPlayer.createGame();

    const transaction = await viaPlayer.stand();

    await expect(transaction).to.emit(viaPlayer, "CardsChangedForDealer").withArgs(player, [6, 7, 8]);
    await expect(transaction).to.emit(viaPlayer, "StateChanged").withArgs(player, State.DealerWins);

    const game = await viaPlayer.getGame();

    expect(game.cardsForPlayer).to.deep.eq([J, Q]);
    expect(game.cardsForDealer).to.deep.eq([6, 7, 8]);
    expect(game.state).to.eq(State.DealerWins);
  });

  it("game ends in a tie", async function () {
    await viaPlayer.plantDeck([0, 0, 0, 0, 9, 8, 9, 8]);
    await viaPlayer.createGame();

    const transaction = await viaPlayer.stand();

    await expect(transaction).to.emit(viaPlayer, "StateChanged").withArgs(player, State.Tie);

    const game = await viaPlayer.getGame();

    expect(game.cardsForPlayer).to.deep.eq([8, 9]);
    expect(game.cardsForDealer).to.deep.eq([8, 9]);
    expect(game.state).to.eq(State.Tie);
  });

  it("player busts", async function () {
    await viaPlayer.plantDeck([0, 0, 0, 9, 8, 7, 8, 7]);
    await viaPlayer.createGame();

    const transaction = await viaPlayer.draw();

    await expect(transaction).to.emit(viaPlayer, "CardsChangedForPlayer").withArgs(player, [7, 8, 9]);
    await expect(transaction).to.emit(viaPlayer, "StateChanged").withArgs(player, State.DealerWins);

    const game = await viaPlayer.getGame();

    expect(game.cardsForPlayer).to.deep.eq([7, 8, 9]);
    expect(game.cardsForDealer).to.deep.eq([7, 8]);
    expect(game.state).to.eq(State.DealerWins);
  });

  it("player wins", async function () {
    await viaPlayer.plantDeck([0, 0, 0, 0, 9, 8, Q, J]);
    await viaPlayer.createGame();

    const transaction = await viaPlayer.stand();

    await expect(transaction).to.emit(viaPlayer, "StateChanged").withArgs(player, State.PlayerWins);

    const game = await viaPlayer.getGame();

    expect(game.cardsForPlayer).to.deep.eq([J, Q]);
    expect(game.cardsForDealer).to.deep.eq([8, 9]);
    expect(game.state).to.eq(State.PlayerWins);
  });

  it("player wins early (Blockjack)", async function () {
    await viaPlayer.plantDeck([0, 0, 0, 0, 7, 6, A, K]);

    const transaction = await viaPlayer.createGame();

    await expect(transaction).to.emit(viaPlayer, "CardsChangedForPlayer").withArgs(player, [K, A]);
    await expect(transaction).to.emit(viaPlayer, "StateChanged").withArgs(player, State.PlayerWins);

    const game = await viaPlayer.getGame();

    expect(game.cardsForPlayer).to.deep.eq([K, A]);
    expect(game.cardsForDealer).to.deep.eq([]);
    expect(game.state).to.eq(State.PlayerWins);
  });

  it("player wins late", async function () {
    await viaPlayer.plantDeck([0, 0, 0, 8, Q, J, 7, 6]);
    await viaPlayer.createGame();
    await viaPlayer.draw();

    const transaction = await viaPlayer.stand();

    await expect(transaction).to.emit(viaPlayer, "StateChanged").withArgs(player, State.PlayerWins);

    const game = await viaPlayer.getGame();

    expect(game.cardsForPlayer).to.deep.eq([6, 7, 8]);
    expect(game.cardsForDealer).to.deep.eq([J, Q]);
    expect(game.state).to.eq(State.PlayerWins);
  });
});
