import React, { useState } from "react";
import "./menuOverlay.css";
import { GameHelper } from "@/core/helpers/game.helper";
import { gameStateAtom } from "@/core/data/gameState";
import { useAtom } from "jotai";
import { RESET } from "jotai/utils";

export default function MenuOverlay({
  onClose,
  open,
}: {
  onClose: () => void;
  open: boolean;
}) {
  const [gameState, setGameState] = useAtom(gameStateAtom);
  const [timeLimit, setTimeLimit] = useState(60);
  const { players } = gameState;

  function handleGameStart() {
    GameHelper.resetPlayers(players, timeLimit);
    setGameState({
      ...gameState,
      hasGameEnded: false,
      winner: null,
      reason: {},
    });
    onClose();
  }

  function handleGameReset() {
    setGameState(RESET);
    const newGame = GameHelper.newGame(timeLimit);
    setGameState((prev: any) => (prev = newGame));
    onClose();
  }

  function closeMenu() {
    onClose();
  }

  return (
    <div className={"menu-overlay " + (open ? "openned" : "closed")}>
      <div className="menu">
        <button className="menu-close" onClick={onClose}>
          X
        </button>
        <h1>Menu</h1>
        <div className="menu-content">
          <p>Choose your time limit</p>
          <select
            className="menu-select"
            onChange={(e) => {
              setTimeLimit(parseInt(e.target.value));
            }}
          >
            <option value={60}>1 min</option>
            <option value={300}>5 min</option>
            <option value={600}>10 min</option>
            <option value={900}>15 min</option>
          </select>
          <div className="menu-buttons">
            <button onClick={handleGameStart}>Start new match</button>
            <button onClick={closeMenu}>Continue</button>
            <button onClick={handleGameReset}>Clean Game</button>
          </div>
        </div>
      </div>
    </div>
  );
}
