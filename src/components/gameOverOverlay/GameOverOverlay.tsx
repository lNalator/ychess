import React, { useState } from "react";
import { gameStateAtom } from "@/core/data/gameState";
import { useAtom } from "jotai";
import { GameHelper } from "@/core/helpers/game.helper";
import "./gameOverOverlay.css";
import { onlineGameAtom } from "@/core/data/onlineGame";
import { requestRematch, respondRematch } from "@/core/api/gameApi";

export default function GameOverOverlay({
  open,
}: Readonly<{
  open: boolean;
}>) {
  const [gameState, setGameState] = useAtom(gameStateAtom);
  const [online, setOnline] = useAtom(onlineGameAtom);
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

  async function handleRequestRematch() {
    if (!online.enabled || !online.gameId) return;
    try {
      await requestRematch({ clientId: online.clientId, gameId: online.gameId });
      await respondRematch({
        clientId: online.clientId,
        gameId: online.gameId,
        accept: true,
      });
      setOnline((prev) => ({ ...prev, rematchRequestedByMe: true }));
    } catch (e) {
      alert(String(e));
    }
  }

  async function handleAcceptRematch() {
    if (!online.enabled || !online.gameId) return;
    try {
      await respondRematch({
        clientId: online.clientId,
        gameId: online.gameId,
        accept: true,
      });
    } catch (e) {
      alert(String(e));
    }
  }

  async function handleDeclineRematch() {
    if (!online.enabled || !online.gameId) return;
    try {
      await respondRematch({
        clientId: online.clientId,
        gameId: online.gameId,
        accept: false,
      });
      setOnline((prev) => ({
        ...prev,
        rematchRequestedByMe: false,
        rematchOpponentRequested: false,
      }));
    } catch (e) {
      alert(String(e));
    }
  }

  return (
    <div className={"gameOver-overlay " + (open ? "openned" : "closed")}>
      <div className="gameOver ">
        <h1>{gameOverReason}</h1>
        <div className="gameOver-content">
          {winner && <p>{winner.name} won</p>}
          {online.enabled && (
            <p style={{ marginTop: "0.75rem" }}>
              {online.rematchOpponentRequested
                ? "Opponent wants a rematch."
                : online.rematchRequestedByMe
                  ? "Waiting for opponent..."
                  : "Rematch?"}
            </p>
          )}
        </div>

        {online.enabled ? (
          <>
            <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap", justifyContent: "center" }}>
              <button
                className="gameOver-button"
                onClick={handleRequestRematch}
                disabled={online.rematchRequestedByMe}
              >
                Request rematch
              </button>
              {online.rematchOpponentRequested && (
                <>
                  <button className="gameOver-button" onClick={handleAcceptRematch}>
                    Accept
                  </button>
                  <button className="gameOver-button" onClick={handleDeclineRematch}>
                    Decline
                  </button>
                </>
              )}
            </div>
          </>
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
      </div>
    </div>
  );
}
