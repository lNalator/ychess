"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useAtom } from "jotai";
import Board from "@/components/Board/Board";
import Timer from "@/components/Timer/Timer";
import GameOverOverlay from "@/components/gameOverOverlay/GameOverOverlay";
import { GameState, gameStateAtom } from "@/core/data/gameState";
import { onlineGameAtom } from "@/core/data/onlineGame";
import { ColorEnum } from "@/core/enums/color.enum";
import PlayerHelper from "@/core/helpers/player.helper";
import { quitGame } from "@/core/api/gameApi";
import { GameHelper } from "@/core/helpers/game.helper";
import { RESET } from "jotai/utils";
import { useGameEventsSubscription } from "@/core/hooks/useGameEventsSubscription";
import "./game.css";

export default function GamePage() {
  const router = useRouter();
  const [gameState, setGameState] = useAtom(gameStateAtom);
  const [online, setOnline] = useAtom(onlineGameAtom);
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

  async function leaveOnlineSession({ goHome }: { goHome: boolean }) {
    const gameId = online.gameId;
    if (online.enabled && gameId) {
      try {
        await quitGame({ clientId: online.clientId, gameId });
      } catch {
        // ignore
      }
    }

    setOnline((prev) => ({
      ...prev,
      enabled: false,
      readOnly: true,
      viewColor: prev.playerColor ?? prev.viewColor,
      playerColor: null,
      gameId: null,
      code: null,
      matchmakingQueued: false,
      rematchOpponentRequested: false,
      rematchRequestedByMe: false,
      disconnect: null,
    }));

    if (goHome) {
      setGameState(RESET);
      setGameState(GameHelper.newGame(300));
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

    if (goHome) {
      setGameState(RESET);
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
        <div className="game-board">
          <Board />
        </div>
        <div className="game-side">
          <div className="game-side-top">
            <Timer player={topPlayer} />
          </div>
          <div className="game-side-bottom">
            <Timer player={bottomPlayer} />
          </div>
        </div>
      </div>
    </div>
  );
}
