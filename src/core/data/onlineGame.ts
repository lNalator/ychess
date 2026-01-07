import { useCallback, useSyncExternalStore } from "react";
import { ColorEnum } from "../enums/color.enum";

export type OnlineGameSession = {
  enabled: boolean;
  gameId: string | null;
  code: string | null;
  clientId: string;
  clientName: string;
  playerColor: ColorEnum | null;
  viewColor: ColorEnum | null;
  readOnly: boolean;
  matchmakingQueued: boolean;
  matchmakingMatchId: string | null;
  gameStatus: string | null;
  realtimeStatus: "idle" | "matchmaking" | "match_found" | "syncing" | "waiting_ready" | "in_game" | "error";
  lastRealtimeError: string | null;
  timeControlInitialSeconds: number;
  timeControlIncrementSeconds: number;
  rematchOpponentRequested: boolean;
  rematchRequestedByMe: boolean;
  drawOfferedByMe: boolean;
  drawOfferedByOpponent: boolean;
  disconnect: null | {
    clientId: string;
    graceSeconds: number;
    deadlineAt: string;
  };
};

function createDefaultSession(): OnlineGameSession {
  return {
    enabled: false,
    gameId: null,
    code: null,
    clientId: crypto.randomUUID(),
    clientName: "",
    playerColor: null,
    viewColor: null,
    readOnly: false,
    matchmakingQueued: false,
    matchmakingMatchId: null,
    gameStatus: null,
    realtimeStatus: "idle",
    lastRealtimeError: null,
    timeControlInitialSeconds: 300,
    timeControlIncrementSeconds: 0,
    rematchOpponentRequested: false,
    rematchRequestedByMe: false,
    drawOfferedByMe: false,
    drawOfferedByOpponent: false,
    disconnect: null,
  };
}

function loadPersisted(): OnlineGameSession {
  if (typeof window === "undefined") return createDefaultSession();
  const storedValue = localStorage.getItem("onlineGame");
  if (storedValue === null) return createDefaultSession();
  try {
    const parsed = JSON.parse(storedValue) as Partial<OnlineGameSession>;
    return {
      ...createDefaultSession(),
      ...parsed,
      clientId: parsed.clientId ?? crypto.randomUUID(),
    };
  } catch {
    return createDefaultSession();
  }
}

let onlineGameStore: OnlineGameSession = loadPersisted();
const onlineGameSubscribers = new Set<() => void>();

function persistOnlineGame(next: OnlineGameSession) {
  if (typeof window !== "undefined") {
    try {
      localStorage.setItem("onlineGame", JSON.stringify(next));
    } catch {
      // ignore persistence failures
    }
  }
}

function setOnlineGameStore(next: OnlineGameSession | ((prev: OnlineGameSession) => OnlineGameSession)) {
  const resolved =
    typeof next === "function" ? (next as (prev: OnlineGameSession) => OnlineGameSession)(onlineGameStore) : next;
  onlineGameStore = resolved;
  persistOnlineGame(resolved);
  for (const listener of onlineGameSubscribers) listener();
}

export function useOnlineGame(): [
  OnlineGameSession,
  (next: OnlineGameSession | ((prev: OnlineGameSession) => OnlineGameSession)) => void,
] {
  const state = useSyncExternalStore(
    (listener) => {
      onlineGameSubscribers.add(listener);
      return () => onlineGameSubscribers.delete(listener);
    },
    () => onlineGameStore,
    () => onlineGameStore
  );

  const setState = useCallback(
    (next: OnlineGameSession | ((prev: OnlineGameSession) => OnlineGameSession)) => setOnlineGameStore(next),
    []
  );

  return [state, setState];
}
