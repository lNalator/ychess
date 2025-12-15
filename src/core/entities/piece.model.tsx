import { ColorEnum } from "../enums/color.enum";
import { AfterMovement } from "../interfaces/afterMovement";
import PiecesHelper from "../helpers/pieces.helper";
import Position from "../interfaces/position";

export default abstract class Piece {
  public id: string;
  public position: Position;
  public isAlive: boolean;
  public color: ColorEnum;
  abstract value: number;
  public name: string;

  constructor(position: Position, color: ColorEnum, name: string, id: string) {
    this.name = name;
    this.position = position;
    this.isAlive = true;
    this.color = color;
    this.id = id;
  }

  public move(position: Position, piece?: Piece): AfterMovement {
    let hasEaten: boolean = false;
    let ate: Piece | null = null;
    if (piece) {
      this.eat(piece);
      hasEaten = true;
      ate = piece;
    }
    this.position = position;
    return { hasEaten, ate };
  }

  public eat(piece: Piece): void {
    piece.isAlive = false;
    piece.position = { horizontal: -1, vertical: -1 };
  }
  
  public getFilteredMovements(
    friendlyPieces: Array<Piece>, 
    enemyPieces: Array<Piece>, 
  ): Position[] {
    // Obtenir les mouvements possibles de la pièce
    const possibleMovements = this.getMovements(friendlyPieces, enemyPieces);

    // Filtrer les mouvements qui sortent le roi de l'échec
    return possibleMovements.filter(move => {
        // Simuler le mouvement
        const simulatedFriendlyPieces: Piece[] = PiecesHelper.simulateMove(friendlyPieces, this, move);

        // Vérifier si le roi est toujours en échec après le mouvement
        return !PiecesHelper.isKingInCheck(simulatedFriendlyPieces, enemyPieces, move);
    });
  }

  public getAttacks(
    currentPlayerPieces: Array<Piece>,
    opponentPieces: Array<Piece>
  ): Array<Position> {
    return this.getMovements(currentPlayerPieces, opponentPieces);
  }

  abstract getMovements(
    currentPlayerPieces: Array<Piece>,
    opponentPieces: Array<Piece>
  ): Array<Position>;
}
