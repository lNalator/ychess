import React from "react";
import { gameStateAtom } from "@/core/data/gameState";
import Player from "@/core/entities/player.model";
import PlayerHelper from "@/core/helpers/player.helper";
import { useAtom } from "jotai";
import "./gameButtons.css";
import { onlineGameAtom } from "@/core/data/onlineGame";

export default function GameButtons({ player }: { player: Player }) {
  const [gameState, setGameState] = useAtom(gameStateAtom);
  const [online] = useAtom(onlineGameAtom);
  const { players, hasGameEnded } = gameState;

  const [askedForDraw, setAskedForDraw] = React.useState(false);

  if (online.enabled) return null;

  const oponnentPlayer = PlayerHelper.getOpponentPlayer(player, players);

  function handleResign() {
    if (!hasGameEnded) {
      oponnentPlayer.score++;
      setGameState({
        ...gameState,
        hasGameEnded: true,
        winner: oponnentPlayer,
        reason: { resign: true },
      });
    }
  }

  function handleDraw() {
    if (oponnentPlayer.askedDraw && !hasGameEnded) {
      setAskedForDraw(true);
      players.forEach((player) => (player.score += 0.5));
      setGameState({
        ...gameState,
        hasGameEnded: true,
        winner: null,
        reason: { draw: true, agreement: true },
      });
    } else if (!hasGameEnded && !player.askedDraw) {
      setAskedForDraw(true);
      player.askedDraw = true;
      setGameState({ ...gameState });
    } else if (!hasGameEnded && player.askedDraw) {
      setAskedForDraw(false);
      player.askedDraw = false;
      setGameState({ ...gameState });
    }
  }

  return (
    <div className="gameButtons-container">
      <button className="gameButtons-resign" onClick={handleResign}>
        Resign
      </button>
      <button
        className={(askedForDraw ? "active " : "") + "gameButtons-draw"}
        onClick={handleDraw}
      >
        Draw
      </button>
    </div>
  );
}
