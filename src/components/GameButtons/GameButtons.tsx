import React from "react";
import { gameStateAtom } from "@/core/data/gameState";
import Player from "@/core/entities/player.model";
import PlayerHelper from "@/core/helpers/player.helper";
import { useAtom } from "jotai";
import "./gameButtons.css";
import { onlineGameAtom } from "@/core/data/onlineGame";
import { offerDraw, resign } from "@/core/api/gameApi";

export default function GameButtons({ player }: { player: Player }) {
  const [gameState, setGameState] = useAtom(gameStateAtom);
  const [online, setOnline] = useAtom(onlineGameAtom);
  const { players, hasGameEnded } = gameState;

  const [askedForDraw, setAskedForDraw] = React.useState(false);
  const opponentPlayer = PlayerHelper.getOpponentPlayer(player, players);

  function handleResign() {
    if (online.enabled && online.gameId) {
      resign({ clientId: online.clientId, gameId: online.gameId }).catch(() => undefined);
      setOnline((prev) => ({ ...prev, readOnly: true }));
      return;
    }
    if (!hasGameEnded) {
      opponentPlayer.score++;
      setGameState({
        ...gameState,
        hasGameEnded: true,
        winner: opponentPlayer,
        reason: { resign: true },
      });
    }
  }

  function handleDraw() {
    if (online.enabled && online.gameId) {
      offerDraw({ clientId: online.clientId, gameId: online.gameId })
        .then((res) => {
          if (res.accepted) {
            setOnline((prev) => ({
              ...prev,
              drawOfferedByMe: false,
              drawOfferedByOpponent: false,
            }));
          } else {
            setOnline((prev) => ({ ...prev, drawOfferedByMe: true }));
          }
        })
        .catch(() => undefined);
      return;
    }
    if (opponentPlayer.askedDraw && !hasGameEnded) {
      setAskedForDraw(true);
      players.forEach((pl) => (pl.score += 0.5));
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

  const drawActive =
    online.enabled ? online.drawOfferedByMe || online.drawOfferedByOpponent : askedForDraw;

  return (
    <div className="gameButtons-container">
      <button className="gameButtons-resign" onClick={handleResign}>
        Resign
      </button>
      <button
        className={(drawActive ? "active " : "") + "gameButtons-draw"}
        onClick={handleDraw}
      >
        Draw
      </button>
    </div>
  );
}
