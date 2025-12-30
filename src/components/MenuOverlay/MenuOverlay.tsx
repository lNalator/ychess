import React, { useState } from "react";
import "./menuOverlay.css";
import { GameHelper } from "@/core/helpers/game.helper";
import { gameStateAtom, reviveGameState } from "@/core/data/gameState";
import { useAtom } from "jotai";
import { RESET } from "jotai/utils";
import { onlineGameAtom } from "@/core/data/onlineGame";
import { createGame, getGame, joinGame, leaveGame } from "@/core/api/gameApi";
import { ColorEnum } from "@/core/enums/color.enum";

export default function MenuOverlay({
  onClose,
  open,
}: {
  onClose: () => void;
  open: boolean;
}) {
  const [gameState, setGameState] = useAtom(gameStateAtom);
  const [online, setOnline] = useAtom(onlineGameAtom);
  const [timeLimit, setTimeLimit] = useState(60);
  const [joinId, setJoinId] = useState("");
  const [name, setName] = useState("");
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
    setGameState(newGame);
    onClose();
  }

  function closeMenu() {
    onClose();
  }

  async function handleCreateOnline() {
    try {
      const game = await createGame({
        playerId: online.playerId,
        name: name || undefined,
        timeLimitSeconds: timeLimit,
      });
      setOnline((prev) => ({
        ...prev,
        enabled: true,
        gameId: game.id,
        playerName: name,
        playerColor:
          ((game.state.players.find((p) => p.id === prev.playerId)?.color as
            | ColorEnum
            | undefined) ?? null),
      }));
      setGameState(reviveGameState(game.state));
      onClose();
    } catch (e) {
      alert(String(e));
    }
  }

  async function handleJoinOnline() {
    try {
      const game = await joinGame(joinId.trim(), {
        playerId: online.playerId,
        name: name || undefined,
      });
      setOnline((prev) => ({
        ...prev,
        enabled: true,
        gameId: game.id,
        playerName: name,
        playerColor:
          ((game.state.players.find((p) => p.id === prev.playerId)?.color as
            | ColorEnum
            | undefined) ?? null),
      }));
      setGameState(reviveGameState(game.state));
      onClose();
    } catch (e) {
      alert(String(e));
    }
  }

  async function handleResyncOnline() {
    if (!online.gameId) return;
    try {
      const game = await getGame(online.gameId);
      setGameState(reviveGameState(game.state));
    } catch (e) {
      alert(String(e));
    }
  }

  async function handleLeaveOnline() {
    if (!online.gameId) return;
    try {
      await leaveGame(online.gameId, { playerId: online.playerId });
    } catch {
      // ignore
    } finally {
      setOnline((prev) => ({
        ...prev,
        enabled: false,
        gameId: null,
        playerColor: null,
      }));
      setGameState(RESET);
      setGameState(GameHelper.newGame(timeLimit));
      onClose();
    }
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

          <hr style={{ width: "100%" }} />

          <p>Online game</p>
          <input
            className="menu-select"
            placeholder="Your name (optional)"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
          {!online.enabled ? (
            <>
              <input
                className="menu-select"
                placeholder="Game ID to join"
                value={joinId}
                onChange={(e) => setJoinId(e.target.value)}
              />
              <div className="menu-buttons">
                <button onClick={handleCreateOnline}>Create online game</button>
                <button onClick={handleJoinOnline} disabled={!joinId.trim()}>
                  Join online game
                </button>
              </div>
            </>
          ) : (
            <>
              <p style={{ wordBreak: "break-all" }}>
                Game ID: <b>{online.gameId}</b>
              </p>
              <p>Your color: {online.playerColor ?? "..."}</p>
              <div className="menu-buttons">
                <button onClick={handleResyncOnline}>Resync</button>
                <button onClick={handleLeaveOnline}>Leave online game</button>
              </div>
            </>
          )}

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
