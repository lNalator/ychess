import { useCallback, useSyncExternalStore } from "react";
import Player from "../entities/player.model";
import { GameHelper } from "../helpers/game.helper";
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
  opponentQuit?: boolean;
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
      (obj.id as string | undefined) ?? (color === ColorEnum.WHITE ? "LOCAL_WHITE" : "LOCAL_BLACK");
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

  if (obj && typeof obj === "object" && typeof obj.name === "string" && classRegistry[obj.name as keyof typeof classRegistry]) {
    const ClassConstructor = classRegistry[obj.name as keyof typeof classRegistry];
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

function loadPersistedState(): GameState {
  if (typeof window === "undefined") return GameHelper.startGame();
  const storedValue = localStorage.getItem("gameState");
  if (!storedValue) return GameHelper.startGame();
  try {
    return JSON.parse(storedValue, reviver);
  } catch {
    return GameHelper.startGame();
  }
}

let gameStateStore: GameState = loadPersistedState();
const gameStateSubscribers = new Set<() => void>();

function persistGameState(next: GameState) {
  if (typeof window !== "undefined") {
    try {
      localStorage.setItem("gameState", JSON.stringify(next));
    } catch {
      // ignore persistence failures
    }
  }
}

function setGameStateStore(next: GameState | ((prev: GameState) => GameState)) {
  const resolved = typeof next === "function" ? (next as (prev: GameState) => GameState)(gameStateStore) : next;
  gameStateStore = resolved;
  persistGameState(resolved);
  for (const listener of gameStateSubscribers) listener();
}

export function useGameState(): [GameState, (next: GameState | ((prev: GameState) => GameState)) => void] {
  const state = useSyncExternalStore(
    (listener) => {
      gameStateSubscribers.add(listener);
      return () => gameStateSubscribers.delete(listener);
    },
    () => gameStateStore,
    () => gameStateStore
  );

  const setState = useCallback((next: GameState | ((prev: GameState) => GameState)) => setGameStateStore(next), []);

  return [state, setState];
}
