import { GameState, reason } from "../data/gameState";
import Player from "../entities/player.model";
import { ColorEnum } from "../enums/color.enum";
import PiecesHelper from "./pieces.helper";

export class GameHelper {
  static startGame(player1Score = 0, player2Score = 0): GameState {
    const player1 = new Player(
      "LOCAL_WHITE",
      "Player 1",
      ColorEnum.WHITE,
      true,
      player1Score
    );
    const player2 = new Player(
      "LOCAL_BLACK",
      "Player 2",
      ColorEnum.BLACK,
      false,
      player2Score
    );

    return {
      players: [player1, player2],
      hasGameEnded: false,
      winner: null,
      reason: {},
    };
  }

  static resetPlayers(players: Array<Player>, chosenTime: number): void {
    players.forEach((player) => {
      player.eatenPieces = [];
      player.pieces = PiecesHelper.createTeam(player.color as ColorEnum);
      player.askedDraw = false;
      player.isPlaying = player.color === ColorEnum.WHITE ? true : false;
      player.time = chosenTime;
    });
  }

  static newGame(chosenTime: number): GameState {
    const game = this.startGame();
    game.players.forEach((player) => {
      player.time = chosenTime;
    });
    return game;
  }

  static getGameOverReason(reason: reason): string {
    if (reason.draw && reason.agreement) {
      return "Draw by agreement";
    } else if (reason.draw) {
      return "Draw";
    } else if (reason.resign) {
      return "Resignation";
    } else if (reason.timeout) {
      return "Timeout";
    } else if (reason.checkmate) {
      return "Checkmate";
    } else if (reason.stalemate) {
      return "Stalemate";
    } else if (reason.insufficientMaterial) {
      return "Insufficient material";
    } else if (reason.repetition) {
      return "Repetition";
    } else {
      return "Unknown reason";
    }
  }
}
