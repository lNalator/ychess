import React, { useState } from "react";
import { gameStateAtom } from "@/core/data/gameState";
import { useAtom } from "jotai";
import { GameHelper } from "@/core/helpers/game.helper";
import "./gameOverOverlay.css";

export default function GameOverOverlay({
  open,
}: Readonly<{
  open: boolean;
}>) {
  const [gameState, setGameState] = useAtom(gameStateAtom);
  const [timeLimit, setTimeLimit] = useState(60);
  const { players, reason, winner } = gameState;

  const gameOverReason = GameHelper.getGameOverReason(reason);

  function handleRematch() {
    GameHelper.resetPlayers(players, timeLimit);
    setGameState({
      ...gameState,
      hasGameEnded: false,
      winner: null,
      reason: {},
    });
  }

  return (
    <div className={"gameOver-overlay " + (open ? "openned" : "closed")}>
      <div className="gameOver ">
        <h1>{gameOverReason}</h1>
        <div className="gameOver-content">
          {winner && <p>{winner.name} won</p>}
        </div>
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
        <button className="gameOver-button" onClick={handleRematch}>
          Rematch
        </button>
      </div>
    </div>
  );
}
