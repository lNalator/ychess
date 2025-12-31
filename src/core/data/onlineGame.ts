import { SetStateAction, WritableAtom } from "jotai";
import { atomWithStorage, createJSONStorage } from "jotai/utils";
import { SyncStorage } from "jotai/vanilla/utils/atomWithStorage";
import { ColorEnum } from "../enums/color.enum";

export type OnlineGameSession = {
  enabled: boolean;
  gameId: string | null;
  code: string | null;
  clientId: string;
  clientName: string;
  playerColor: ColorEnum | null;
  matchmakingQueued: boolean;
  timeControlInitialSeconds: number;
  timeControlIncrementSeconds: number;
  rematchOpponentRequested: boolean;
  rematchRequestedByMe: boolean;
};

function createDefaultSession(): OnlineGameSession {
  return {
    enabled: false,
    gameId: null,
    code: null,
    clientId: crypto.randomUUID(),
    clientName: "",
    playerColor: null,
    matchmakingQueued: false,
    timeControlInitialSeconds: 300,
    timeControlIncrementSeconds: 0,
    rematchOpponentRequested: false,
    rematchRequestedByMe: false,
  };
}

const storage: SyncStorage<OnlineGameSession> = createJSONStorage(
  () => localStorage
);
storage.getItem = (key) => {
  const storedValue = localStorage.getItem(key);
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
};

export const onlineGameAtom = atomWithStorage<OnlineGameSession>(
  "onlineGame",
  createDefaultSession(),
  storage
) as WritableAtom<OnlineGameSession, [SetStateAction<OnlineGameSession>], void>;
