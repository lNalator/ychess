import { ColorEnum } from "../enums/color.enum";
import PiecesHelper from "../helpers/pieces.helper";
import Position from "../interfaces/position";
import Piece, { afterMovement } from "./piece.model";

export default class Pawn extends Piece {
  value: number;
  isFirstMove: boolean;
  doubleJump: boolean;

  constructor(position: Position, color: ColorEnum, id: string) {
    super(position, color, "Pawn", id);
    this.isFirstMove = true;
    this.doubleJump = false;
    this.value = 1;
  }

  public move(position: Position, piece?: Piece): afterMovement {
    let hasEaten: boolean = false;
    let ate: Piece | null = null;

    this.isFirstMove = false;
    if (piece) {
      this.eat(piece);
      hasEaten = true;
      ate = piece;
    }
    if (
      position.vertical === this.position.vertical + 2 ||
      position.vertical === this.position.vertical - 2
    ) {
      this.doubleJump = true; //TODO remettre à false lorsque un pion a doubleJump = true et que c'est son tour
    }
    this.position = position;
    return { hasEaten, ate };
  }

  getMovements(allPieces: Array<Piece>): Array<Position> {
    const movements: Array<Position> = [];
    const horizontal: number = this.position.horizontal;
    const vertical: number = this.position.vertical;
    let colorValue: number;

    if (this.color === ColorEnum.WHITE) {
      colorValue = 1;
    } else {
      colorValue = -1;
    }

    const newPosition1: Position = {
      horizontal: horizontal,
      vertical: vertical + colorValue,
    };
    if (PiecesHelper.getPieceByPosition(newPosition1, allPieces) === null) {
      movements.push(newPosition1);
      if (this.isFirstMove) {
        const newPosition2: Position = {
          horizontal: horizontal,
          vertical: vertical + colorValue * 2,
        };
        if (PiecesHelper.getPieceByPosition(newPosition2, allPieces) === null) {
          movements.push(newPosition2);
        }
      }
    }

    const newPosition3: Position = {
      horizontal: horizontal + 1,
      vertical: vertical + colorValue,
    };
    if (
      PiecesHelper.getPieceByPosition(newPosition3, allPieces)?.color !==
        this.color &&
      PiecesHelper.getPieceByPosition(newPosition3, allPieces) !== null
    ) {
      movements.push(newPosition3);
    }
    const newPosition4: Position = {
      horizontal: horizontal - 1,
      vertical: vertical + colorValue,
    };
    if (
      PiecesHelper.getPieceByPosition(newPosition4, allPieces)?.color !==
        this.color &&
      PiecesHelper.getPieceByPosition(newPosition4, allPieces) !== null
    ) {
      movements.push(newPosition4);
    }

    const newPosition5: Position = {
      horizontal: horizontal + 1,
      vertical: vertical,
    };
    if (
      PiecesHelper.getPieceByPosition(newPosition5, allPieces)?.color !==
      this.color
    ) {
      const enPassantPawn = PiecesHelper.getPieceByPosition(
        newPosition5,
        allPieces
      ) as Pawn;
      if (enPassantPawn?.doubleJump) {
        movements.push(newPosition5);
      }
    }
    const newPosition6: Position = {
      horizontal: horizontal - 1,
      vertical: vertical,
    };
    if (
      PiecesHelper.getPieceByPosition(newPosition6, allPieces)?.color !==
      this.color
    ) {
      const enPassantPawn = PiecesHelper.getPieceByPosition(
        newPosition6,
        allPieces
      ) as Pawn;
      if (enPassantPawn?.doubleJump) {
        movements.push(newPosition6);
      }
    }

    return movements;
  }
}
