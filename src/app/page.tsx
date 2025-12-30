"use client";
import { useState } from "react";
import Timer from "@/components/Timer/Timer";
import Board from "@/components/Board/Board";
import MenuOverlay from "@/components/MenuOverlay/MenuOverlay";
import "./page.css";
import { useAtom } from "jotai";
import { GameState, gameStateAtom } from "@/core/data/gameState";
import GameOverOverlay from "@/components/gameOverOverlay/GameOverOverlay";
import { useGameEventsSubscription } from "@/core/hooks/useGameEventsSubscription";

export default function Home() {
  const [gameState] = useAtom(gameStateAtom);
  const { players, hasGameEnded }: GameState = gameState;
  const [isMenuOpen, setIsMenuOpen] = useState(true);

  useGameEventsSubscription();

  function handleMenuClicked() {
    setIsMenuOpen(!isMenuOpen);
  }

  return (
    <div id="main" suppressHydrationWarning={true}>
      <button className="menu-button" onClick={() => handleMenuClicked()}>
        Menu
      </button>
      <MenuOverlay onClose={handleMenuClicked} open={isMenuOpen} />
      <GameOverOverlay open={hasGameEnded} />
      <div className="timerContainer">
        <Timer player={players[1]} className="player2" />
      </div>
      <Board />
      <div className="timerContainer">
        <Timer player={players[0]} className="player1" />
      </div>
    </div>
  );
}
