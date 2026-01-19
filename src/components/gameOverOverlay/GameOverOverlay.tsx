"use client";

import React, { useState } from "react";
import { useGameState } from "@/core/data/gameState";
import { GameHelper } from "@/core/helpers/game.helper";
import "./gameOverOverlay.css";
import { useOnlineGame } from "@/core/data/onlineGame";
import { useRouter } from "next/navigation";

export default function GameOverOverlay({
  open,
}: Readonly<{
  open: boolean;
}>) {
  const router = useRouter();
  const [gameState, setGameState] = useGameState();
  const [online, setOnline] = useOnlineGame();
  const [timeLimit, setTimeLimit] = useState(300);
  const { players, reason, winner } = gameState;

  const gameOverReason = GameHelper.getGameOverReason(reason);

  function handleOfflineRematch() {
    GameHelper.resetPlayers(players, timeLimit);
    setGameState({
      ...gameState,
      hasGameEnded: false,
      winner: null,
      reason: {},
    });
  }

  function handleQuitToMenu() {
    // Clear persisted atoms for a clean next game.
    try {
      localStorage.removeItem("onlineGame");
      localStorage.removeItem("gameState");
    } catch {
      // ignore
    }
    setOnline((prev) => ({
      ...prev,
      enabled: false,
      mode: "local",
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
      timeControlInitialSeconds: 300,
      timeControlIncrementSeconds: 0,
      rematchOpponentRequested: false,
      rematchRequestedByMe: false,
      drawOfferedByMe: false,
      drawOfferedByOpponent: false,
      disconnect: null,
    }));
    setGameState(GameHelper.newGame(300));
    router.push("/");
  }

  return (
    <div className={"gameOver-overlay " + (open ? "openned" : "closed")}>
      <div className="gameOver ">
        <h1>{gameOverReason}</h1>
        <div className="gameOver-content">
          {winner && <p>{winner.name} won</p>}
          {online.enabled && (
            <p style={{ marginTop: "0.75rem" }}>
              Start a new online game from the home screen to play again.
            </p>
          )}
        </div>

        {online.enabled ? (
          <p className="gameOver-content" style={{ textAlign: "center" }}>
            Go back home and create a new invite or matchmaking session.
          </p>
        ) : (
          <>
            <select
              className="gameOver-select"
              onChange={(e) => {
                setTimeLimit(parseInt(e.target.value));
              }}
            >
              <option value={60}>1 min</option>
              <option value={300}>5 min</option>
              <option value={600}>10 min</option>
              <option value={900}>15 min</option>
            </select>
            <button className="gameOver-button" onClick={handleOfflineRematch}>
              Rematch
            </button>
          </>
        )}
        <button className="gameOver-button" onClick={handleQuitToMenu}>
          Quit to menu
        </button>
      </div>
    </div>
  );
}
