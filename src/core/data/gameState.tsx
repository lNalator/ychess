import { SetStateAction, WritableAtom } from "jotai";
import Player from "../entities/player.model";
import { GameHelper } from "../helpers/game.helper";
import { atomWithStorage, createJSONStorage } from "jotai/utils";
import { SyncStorage } from "jotai/vanilla/utils/atomWithStorage";
import Piece from "../entities/piece.model";
import Pawn from "../entities/pawn.model";
import King from "../entities/king.model";
import Queen from "../entities/queen.model";
import Rook from "../entities/rook.model";
import Bishop from "../entities/bishop.model";
import Knight from "../entities/knight.model";
import { ColorEnum } from "../enums/color.enum";

export type GameState = {
  players: Array<Player>;
  hasGameEnded: boolean;
  winner: Player | null;
  reason: reason;
};

export type reason = {
  checkmate?: boolean;
  stalemate?: boolean;
  insufficientMaterial?: boolean;
  repetition?: boolean;
  draw?: boolean;
  resign?: boolean;
  timeout?: boolean;
  agreement?: boolean;
};

const classRegistry = {
  Pawn,
  King,
  Queen,
  Rook,
  Bishop,
  Knight,
};

function reviver(_key: string, value: unknown) {
  const obj = value as Record<string, unknown> | null;

  if (
    obj &&
    typeof obj === "object" &&
    Object.prototype.hasOwnProperty.call(obj, "name") &&
    Object.prototype.hasOwnProperty.call(obj, "color") &&
    Object.prototype.hasOwnProperty.call(obj, "eatenPieces")
  ) {
    const color = obj.color as ColorEnum;
    const playerId =
      (obj.id as string | undefined) ??
      (color === ColorEnum.WHITE ? "LOCAL_WHITE" : "LOCAL_BLACK");
    return new Player(
      playerId,
      obj.name as string,
      obj.color as string,
      obj.isPlaying as boolean,
      obj.time as number,
      obj.pieces as Array<Piece>,
      obj.eatenPieces as Array<Piece>,
      obj.score as number,
      obj.askedDraw as boolean
    );
  }

  if (
    obj &&
    typeof obj === "object" &&
    typeof obj.name === "string" &&
    classRegistry[obj.name as keyof typeof classRegistry]
  ) {
    const ClassConstructor =
      classRegistry[obj.name as keyof typeof classRegistry];
    return Object.assign(
      new ClassConstructor(
        obj.position as { vertical: number; horizontal: number },
        obj.color as ColorEnum,
        obj.id as string
      ),
      obj
    );
  }
  return value;
}

export function reviveGameState(state: unknown): GameState {
  return JSON.parse(JSON.stringify(state), reviver) as GameState;
}

const storage: SyncStorage<GameState> = createJSONStorage(() => localStorage);
storage.getItem = (key) => {
  const storedValue = localStorage.getItem(key);
  if (storedValue === null) return GameHelper.startGame();
  return JSON.parse(storedValue, reviver);
};

export const gameStateAtom = atomWithStorage<GameState>(
  "gameState",
  GameHelper.startGame(),
  storage
) as WritableAtom<GameState, [SetStateAction<GameState>], void>;
