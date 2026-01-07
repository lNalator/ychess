"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Board from "@/components/Board/Board";
import Timer from "@/components/Timer/Timer";
import GameOverOverlay from "@/components/gameOverOverlay/GameOverOverlay";
import { GameState, useGameState } from "@/core/data/gameState";
import { useOnlineGame } from "@/core/data/onlineGame";
import { ColorEnum } from "@/core/enums/color.enum";
import PlayerHelper from "@/core/helpers/player.helper";
import { resign } from "@/core/api/gameApi";
import { GameHelper } from "@/core/helpers/game.helper";
import { useGameEventsSubscription } from "@/core/hooks/useGameEventsSubscription";
import { closeAllGraphQLWsConnections } from "@/core/api/graphqlWs";
import "./game.css";

export default function GamePage() {
  const router = useRouter();
  const [gameState, setGameState] = useGameState();
  const [online, setOnline] = useOnlineGame();
  const { players, hasGameEnded }: GameState = gameState;

  useGameEventsSubscription();

  const [isQuitOpen, setIsQuitOpen] = useState(false);

  const effectiveColor = online.enabled ? online.playerColor : online.viewColor;
  const bottomColor = (effectiveColor ?? ColorEnum.WHITE) as ColorEnum;
  const bottomPlayer = useMemo(
    () => players.find((p) => p.color === bottomColor) ?? players[0],
    [players, bottomColor]
  );
  const topPlayer = useMemo(
    () => players.find((p) => p.id !== bottomPlayer.id) ?? players[1],
    [players, bottomPlayer]
  );

  const isOnlineActive = online.enabled && !!online.gameId;
  const isWaitingForSync =
    online.enabled &&
    (online.gameStatus === null ||
      (online.gameStatus !== "RUNNING" && online.gameStatus !== "ENDED"));

  async function leaveOnlineSession({ goHome }: { goHome: boolean }) {
    const gameId = online.gameId;
    if (online.enabled && gameId) {
      try {
        await resign({ clientId: online.clientId, gameId });
      } catch {
        // ignore
      }
    }

    try {
      localStorage.removeItem("onlineGame");
      localStorage.removeItem("gameState");
    } catch {
      // ignore storage errors
    }
    closeAllGraphQLWsConnections();

    setOnline((prev) => ({
      ...prev,
      enabled: false,
      readOnly: true,
      viewColor: prev.playerColor ?? prev.viewColor,
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
      disconnect: null,
    }));

    if (goHome) {
      setGameState(GameHelper.newGame(online.timeControlInitialSeconds ?? 300));
      router.push("/");
    }
  }

  function endLocalByQuit({ goHome }: { goHome: boolean }) {
    const playing = PlayerHelper.getPlayingPlayer(players);
    const opponent = PlayerHelper.getOpponentPlayer(playing, players);
    setGameState({
      ...gameState,
      hasGameEnded: true,
      winner: opponent,
      reason: { resign: true },
    });

    try {
      localStorage.removeItem("onlineGame");
      localStorage.removeItem("gameState");
    } catch {
      // ignore
    }
    closeAllGraphQLWsConnections();

    if (goHome) {
      setGameState(GameHelper.newGame(300));
      router.push("/");
    }
  }

  async function handleQuitStay() {
    setIsQuitOpen(false);
    if (isOnlineActive) {
      await leaveOnlineSession({ goHome: false });
    } else {
      endLocalByQuit({ goHome: false });
    }
  }

  async function handleQuitHome() {
    setIsQuitOpen(false);
    if (isOnlineActive) {
      await leaveOnlineSession({ goHome: true });
    } else {
      endLocalByQuit({ goHome: true });
    }
  }

  return (
    <div className="game-root" suppressHydrationWarning={true}>
      <div className="game-topbar">
        <button className="game-btn" onClick={() => setIsQuitOpen(true)}>
          Quit
        </button>
      </div>

      {(online.lastRealtimeError || isWaitingForSync) && (
        <div className="game-status">
          {online.lastRealtimeError ? (
            <span className="game-status-error">{online.lastRealtimeError}</span>
          ) : (
            <span className="game-status-info">Waiting for sync...</span>
          )}
        </div>
      )}

      {isQuitOpen && (
        <div className="game-overlay">
          <div className="game-dialog">
            <h2>Quit game?</h2>
            <p>
              {isOnlineActive
                ? "You will leave the online session. The board stays as a read-only snapshot."
                : "The local game will end (resign)."}
            </p>
            <div className="game-dialog-actions">
              <button className="game-btn" onClick={handleQuitStay}>
                Stay on board
              </button>
              <button className="game-btn" onClick={handleQuitHome}>
                Go back Home
              </button>
              <button className="game-btn" onClick={() => setIsQuitOpen(false)}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      <GameOverOverlay open={hasGameEnded} />

      <div className="game-main">
        <div className="game-player-top">
          <Timer player={topPlayer} />
        </div>
        <div className="game-board">
          <Board />
        </div>
        <div className="game-player-bottom">
          <Timer player={bottomPlayer} />
        </div>
      </div>
    </div>
  );
}
