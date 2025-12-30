import { SetStateAction, WritableAtom } from "jotai";
import { atomWithStorage, createJSONStorage } from "jotai/utils";
import { SyncStorage } from "jotai/vanilla/utils/atomWithStorage";
import { ColorEnum } from "../enums/color.enum";

export type OnlineGameSession = {
  enabled: boolean;
  gameId: string | null;
  playerId: string;
  playerName: string;
  playerColor: ColorEnum | null;
};

function createDefaultSession(): OnlineGameSession {
  return {
    enabled: false,
    gameId: null,
    playerId: crypto.randomUUID(),
    playerName: "",
    playerColor: null,
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
      playerId: parsed.playerId ?? crypto.randomUUID(),
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
