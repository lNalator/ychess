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
import { useMatchmakingEventsSubscription } from "@/core/hooks/useMatchmakingEventsSubscription";
import { onlineGameAtom } from "@/core/data/onlineGame";
import { quitGame } from "@/core/api/gameApi";
import { GameHelper } from "@/core/helpers/game.helper";
import { RESET } from "jotai/utils";

export default function Home() {
  const [gameState, setGameState] = useAtom(gameStateAtom);
  const [online, setOnline] = useAtom(onlineGameAtom);
  const { players, hasGameEnded }: GameState = gameState;
  const [isMenuOpen, setIsMenuOpen] = useState(true);

  useGameEventsSubscription();
  useMatchmakingEventsSubscription();

  function handleMenuClicked() {
    setIsMenuOpen(!isMenuOpen);
  }

  async function handleQuit() {
    if (!online.enabled || !online.gameId) return;
    try {
      await quitGame({ clientId: online.clientId, gameId: online.gameId });
    } catch {
      // ignore
    } finally {
      setOnline((prev) => ({
        ...prev,
        enabled: false,
        gameId: null,
        code: null,
        playerColor: null,
        matchmakingQueued: false,
        rematchOpponentRequested: false,
        rematchRequestedByMe: false,
      }));
      setGameState(RESET);
      setGameState(GameHelper.newGame(300));
      setIsMenuOpen(true);
    }
  }

  return (
    <div id="main" suppressHydrationWarning={true}>
      <button className="menu-button" onClick={() => handleMenuClicked()}>
        Menu
      </button>
      {online.enabled && online.gameId && (
        <button className="menu-button" onClick={handleQuit} style={{ right: "5.2rem" }}>
          Quit
        </button>
      )}
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
