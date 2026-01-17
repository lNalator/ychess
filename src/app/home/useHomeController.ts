import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useGameState } from "@/core/data/gameState";
import { useOnlineGame } from "@/core/data/onlineGame";
import { GameHelper } from "@/core/helpers/game.helper";
import { ColorEnum } from "@/core/enums/color.enum";
import {
  buildGameStateFromGame,
  clientReady,
  createInviteGame,
  dequeueMatchmaking,
  enqueueMatchmaking,
  getGameSession,
  joinInviteGame,
} from "@/core/api/gameApi";
import { closeAllGraphQLWsConnections, ensureGraphQLWsConnection } from "@/core/api/graphqlWs";
import { useMatchmakingEventsSubscription } from "@/core/hooks/useMatchmakingEventsSubscription";
import { HomeView, TimeControlChoice } from "./types";
import { PuzzlesDifficultyEnum } from "@/shared/enums/puzzles-difficulty.enum";
import { PuzzlesThemesEnum } from "@/shared/enums/puzzles-themes.enum";

export function useHomeController() {
  const router = useRouter();
  const [, setGameState] = useGameState();
  const [online, setOnline] = useOnlineGame();
  useMatchmakingEventsSubscription();

  const [view, setView] = useState<HomeView>("root");
  const [timeLimit, setTimeLimit] = useState(300);
  const [name, setName] = useState("");
  const [code, setCode] = useState("");

  const [puzzlesDifficulty, setPuzzlesDifficulty] = useState(PuzzlesDifficultyEnum.normal);
  const [puzzlesTheme, setPuzzlesTheme] = useState(PuzzlesThemesEnum.None);

  const timeControl: TimeControlChoice = useMemo(
    () => ({ initialSeconds: timeLimit, incrementSeconds: 0 }),
    [timeLimit]
  );

  useEffect(() => {
    const wantsSocket =
      view === "online" ||
      view === "online-code" ||
      view === "online-matchmaking" ||
      online.matchmakingQueued ||
      online.enabled;
    if (wantsSocket) {
      ensureGraphQLWsConnection({ clientId: online.clientId });
    } else {
      closeAllGraphQLWsConnections();
    }
  }, [view, online.clientId, online.enabled, online.matchmakingQueued]);

  useEffect(() => {
    // Reset any previous session and enforce a fresh clientId + socket.
    const freshClientId = crypto.randomUUID();
    closeAllGraphQLWsConnections();
    setOnline((prev) => ({
      ...prev,
      enabled: false,
      readOnly: false,
      viewColor: null,
      playerColor: null,
      gameId: null,
      code: null,
      matchmakingQueued: false,
      matchmakingMatchId: null,
      gameStatus: null,
      realtimeStatus: "idle",
      lastRealtimeError: null,
      rematchOpponentRequested: false,
      rematchRequestedByMe: false,
      drawOfferedByMe: false,
      drawOfferedByOpponent: false,
      disconnect: null,
      clientId: freshClientId,
    }));
    setGameState(GameHelper.newGame(300));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (online.enabled && online.gameId) {
      router.push(`/game?gameId=${online.gameId}`);
    }
  }, [online.enabled, online.gameId, router]);

  const startLocalVsFriend = () => {
    setOnline((prev) => ({
      ...prev,
      enabled: false,
      readOnly: false,
      viewColor: null,
      playerColor: null,
      gameId: null,
      code: null,
      matchmakingQueued: false,
      matchmakingMatchId: null,
      gameStatus: null,
      realtimeStatus: "idle",
      lastRealtimeError: null,
      disconnect: null,
    }));
    setGameState(GameHelper.newGame(timeLimit));
    router.push("/game");
  };

  const startOnlineCreateInvite = async () => {
    const invite = await createInviteGame({
      clientId: online.clientId,
      name: name || undefined,
      timeControl,
    });
    const session = await getGameSession({ gameId: invite.gameId, clientId: online.clientId });
    setOnline((prev) => ({
      ...prev,
      enabled: true,
      readOnly: false,
      matchmakingQueued: false,
      matchmakingMatchId: null,
      gameId: session.gameId,
      code: invite.code ?? null,
      clientName: name,
      playerColor: session.playerColor as ColorEnum,
      viewColor: session.playerColor as ColorEnum,
      gameStatus: session.game.status,
      realtimeStatus: session.game.status === "RUNNING" ? "in_game" : "waiting_ready",
      lastRealtimeError: null,
      timeControlInitialSeconds: session.game.timeControl.initialSeconds,
      timeControlIncrementSeconds: session.game.timeControl.incrementSeconds ?? 0,
      rematchOpponentRequested: false,
      rematchRequestedByMe: false,
      drawOfferedByMe: false,
      drawOfferedByOpponent: false,
      disconnect: null,
    }));
    setGameState(buildGameStateFromGame(session.game));
    if (invite.code) {
      window.prompt("Invite code (share this):", invite.code);
    }
    router.push(`/game?gameId=${session.gameId}`);
  };

  const startOnlineJoinInvite = async () => {
    const joined = await joinInviteGame({
      clientId: online.clientId,
      name: name || undefined,
      code: code.trim(),
    });
    const session = await getGameSession({ gameId: joined.gameId, clientId: online.clientId });
    setOnline((prev) => ({
      ...prev,
      enabled: true,
      readOnly: false,
      matchmakingQueued: false,
      matchmakingMatchId: null,
      gameId: session.gameId,
      code: session.code ?? null,
      clientName: name,
      playerColor: session.playerColor as ColorEnum,
      viewColor: session.playerColor as ColorEnum,
      gameStatus: session.game.status,
      realtimeStatus: session.game.status === "RUNNING" ? "in_game" : "waiting_ready",
      lastRealtimeError: null,
      timeControlInitialSeconds: session.game.timeControl.initialSeconds,
      timeControlIncrementSeconds: session.game.timeControl.incrementSeconds ?? 0,
      rematchOpponentRequested: false,
      rematchRequestedByMe: false,
      drawOfferedByMe: false,
      drawOfferedByOpponent: false,
      disconnect: null,
    }));
    setGameState(buildGameStateFromGame(session.game));
    if (session.game.status === "READY_CHECK") {
      clientReady({ clientId: online.clientId, gameId: session.gameId }).catch(() => undefined);
    }
    router.push(`/game?gameId=${session.gameId}`);
  };

  const startOnlineMatchmaking = async () => {
    setOnline((prev) => ({
      ...prev,
      enabled: false,
      readOnly: false,
      viewColor: null,
      playerColor: null,
      gameId: null,
      code: null,
      matchmakingQueued: true,
      matchmakingMatchId: null,
      clientName: name,
      gameStatus: null,
      realtimeStatus: "matchmaking",
      lastRealtimeError: null,
      timeControlInitialSeconds: timeControl.initialSeconds,
      timeControlIncrementSeconds: timeControl.incrementSeconds ?? 0,
      rematchOpponentRequested: false,
      rematchRequestedByMe: false,
      disconnect: null,
    }));

    await enqueueMatchmaking({
      clientId: online.clientId,
      name: name || undefined,
      timeControl,
    });
  };

  const cancelOnlineMatchmaking = async () => {
    try {
      await dequeueMatchmaking({ clientId: online.clientId });
    } catch {
      // ignore
    } finally {
      setOnline((prev) => ({
        ...prev,
        matchmakingQueued: false,
        matchmakingMatchId: null,
        realtimeStatus: "idle",
      }));
    }
  };

  const startPuzzles = () => {};

  return {
    view,
    setView,
    timeLimit,
    setTimeLimit,
    name,
    setName,
    code,
    setCode,
    timeControl,
    online,
    puzzlesDifficulty,
    setPuzzlesDifficulty,
    puzzlesTheme,
    setPuzzlesTheme,
    startLocalVsFriend,
    startOnlineCreateInvite,
    startOnlineJoinInvite,
    startOnlineMatchmaking,
    cancelOnlineMatchmaking,
    startPuzzles,
  };
}
