import { useCallback, useEffect, useRef, useState } from "react";
import Player from "@/core/entities/player.model";
import "./timer.css";
import Image from "next/image";
import PlayerHelper from "@/core/helpers/player.helper";
import { useGameState } from "@/core/data/gameState";
import GameButtons from "../GameButtons/GameButtons";
import { useOnlineGame } from "@/core/data/onlineGame";

export default function Timer({
  player,
  className,
  hideClock = false,
}: Readonly<{
  player: Player;
  className?: string;
  hideClock?: boolean;
}>) {
  const [gameState, setGameState] = useGameState();
  const [online] = useOnlineGame();
  const { players, hasGameEnded } = gameState;
  const oponnentPlayer = PlayerHelper.getOpponentPlayer(player, players);
  const [time, setTime] = useState(player.time); // Local state to track time
  const [disconnectLeftSeconds, setDisconnectLeftSeconds] = useState<
    number | null
  >(null);

  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const handleLostByTime = useCallback(() => {
    oponnentPlayer.score++;
    setGameState((prev) => ({
      ...prev,
      hasGameEnded: true,
      winner: oponnentPlayer,
      reason: { timeout: true },
    }));
  }, [oponnentPlayer, setGameState]);

  useEffect(() => {
    if (online.enabled || online.readOnly) return;
    if (hasGameEnded) {
      clearInterval(intervalRef.current!);
      return;
    }

    if (player.isPlaying && player.time > 0) {
      intervalRef.current = setInterval(() => {
        const timing = player.time;
        if (hasGameEnded || timing <= 0) {
          clearInterval(intervalRef.current!);
          if (timing <= 0) {
            setTime(Math.max(timing, 0));
            handleLostByTime();
          }
          return;
        }

        setTime(timing - 1);
        player.time = timing - 1;
      }, 1000);
    }

    return () => clearInterval(intervalRef.current!);
  }, [
    online.enabled,
    online.readOnly,
    player,
    player.isPlaying,
    player.time,
    hasGameEnded,
    handleLostByTime,
  ]);

  useEffect(() => {
    const dc = online.disconnect;
    if (!dc || dc.clientId !== player.id) {
      setDisconnectLeftSeconds(null);
      return;
    }

    const update = () => {
      const deadlineMs = Date.parse(dc.deadlineAt);
      const left = Math.max(0, Math.ceil((deadlineMs - Date.now()) / 1000));
      setDisconnectLeftSeconds(left);
    };

    update();
    const id = setInterval(update, 250);
    return () => clearInterval(id);
  }, [online.disconnect, player.id]);

  useEffect(() => {
    setTime(player.time);
  }, [player.time]);

  const minutes = Math.floor((time / 60) % 60);
  const seconds = Math.floor(time % 60);

  const groupedEatenPieces = player.eatenPieces.reduce((acc, piece) => {
    const key = piece.color + piece.name;
    acc[key] = acc[key] || [];
    acc[key].push(piece);
    return acc;
  }, {} as Record<string, typeof player.eatenPieces>);

  const sortedGroupedEatenPieces = Object.values(groupedEatenPieces).sort(
    (a, b) => a[0].value - b[0].value
  );

  const playerPointDifference = PlayerHelper.getPlayersScoreDiff(
    player,
    oponnentPlayer
  );

  return (
    <div className={"timer " + className}>
      <div className="timer-rightSide">
        <h1 className="timer-player-name">{player.name}</h1>
        <div className="timer-player-eaten-pieces">
          {sortedGroupedEatenPieces.map((pieces, index) => (
            <div key={index} className="eaten-piece-group">
              {pieces.map((piece, i) => (
                <Image
                  key={i}
                  width={35}
                  height={35}
                  src={`/imgs/${
                    Array.from(piece.color.toLowerCase())[0] +
                    piece.name.toLowerCase()
                  }.png`}
                  alt={piece.color + " " + piece.name}
                  className="eatenPiece"
                />
              ))}
            </div>
          ))}
          {playerPointDifference > 0 && (
            <div className="eaten-piece-score">+ {playerPointDifference}</div>
          )}
        </div>
      </div>
      <div className="timer-score">
        <p>{player.score}</p>
      </div>
      <div className="timer-leftSide">
        <div className="time">
          {!hideClock && (
            <p>
              {minutes < 10 ? `0${minutes} ` : minutes + " "}:
              {seconds < 10 ? ` 0${seconds}` : " " + seconds}
            </p>
          )}
          {hideClock && <p>No timer</p>}
          {disconnectLeftSeconds !== null && (
            <p style={{ fontSize: "0.9rem", opacity: 0.9 }}>
              leaving in {disconnectLeftSeconds}s
            </p>
          )}
        </div>
        <GameButtons player={player} />
      </div>
    </div>
  );
}
