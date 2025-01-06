import { ColorEnum } from "../enums/color.enum";
import Position from "../interfaces/position";
import Piece from "./piece.model";

export default class Pawn extends Piece {
    value: number;
    isFirstMove: boolean;

    constructor(position: Position, color: ColorEnum) {
        super(position, color);
        this.isFirstMove = true;
        this.value = 1;
    }

    getMovements(canEatLeft?: boolean, canEatRight?: boolean): Array<Position> {
        const movements: Array<Position> = [];
        const newPosition: Position = this.position;

        newPosition.vertical += 1;
        movements.push(newPosition);
        if(this.isFirstMove) {
            newPosition.vertical += 1;
            movements.push(newPosition);
            newPosition.vertical -= 1;
        }
        if(canEatRight) {
            newPosition.horizontal = this.position.horizontal + 1;
            movements.push(newPosition);
        }
        if(canEatLeft) {
            newPosition.horizontal = this.position.horizontal - 1;
            movements.push(newPosition);
        }

        return movements;
    }
}