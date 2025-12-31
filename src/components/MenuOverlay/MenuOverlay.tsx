import React, { useMemo, useState } from "react";
import "./menuOverlay.css";
import { GameHelper } from "@/core/helpers/game.helper";
import { gameStateAtom, reviveGameState } from "@/core/data/gameState";
import { useAtom } from "jotai";
import { RESET } from "jotai/utils";
import { onlineGameAtom } from "@/core/data/onlineGame";
import {
  createInviteGame,
  dequeueMatchmaking,
  enqueueMatchmaking,
  getGameSession,
  joinInviteGame,
  quitGame,
} from "@/core/api/gameApi";
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

  const { players } = gameState;

  const [timeLimit, setTimeLimit] = useState(300);
  const [code, setCode] = useState("");
  const [name, setName] = useState("");

  const timeControl = useMemo(
    () => ({ initialSeconds: timeLimit, incrementSeconds: 0 }),
    [timeLimit]
  );

  function handleOfflineStart() {
    GameHelper.resetPlayers(players, timeLimit);
    setGameState({
      ...gameState,
      hasGameEnded: false,
      winner: null,
      reason: {},
    });
    onClose();
  }

  function handleOfflineReset() {
    setGameState(RESET);
    const newGame = GameHelper.newGame(timeLimit);
    setGameState(newGame);
    onClose();
  }

  async function handleCreateInvite() {
    try {
      const session = await createInviteGame({
        clientId: online.clientId,
        name: name || undefined,
        timeControl,
      });

      setOnline((prev) => ({
        ...prev,
        enabled: true,
        matchmakingQueued: false,
        gameId: session.gameId,
        code: session.code ?? null,
        clientName: name,
        playerColor: session.playerColor as ColorEnum,
        timeControlInitialSeconds: timeControl.initialSeconds,
        timeControlIncrementSeconds: timeControl.incrementSeconds ?? 0,
        rematchOpponentRequested: false,
        rematchRequestedByMe: false,
      }));

      setGameState(reviveGameState(session.game.state));
      onClose();

      if (session.code) {
        window.prompt("Invite code (share this):", session.code);
      }
    } catch (e) {
      alert(String(e));
    }
  }

  async function handleJoinInvite() {
    try {
      const session = await joinInviteGame({
        clientId: online.clientId,
        name: name || undefined,
        code: code.trim(),
      });

      setOnline((prev) => ({
        ...prev,
        enabled: true,
        matchmakingQueued: false,
        gameId: session.gameId,
        code: session.code ?? null,
        clientName: name,
        playerColor: session.playerColor as ColorEnum,
        timeControlInitialSeconds: session.game.timeControl.initialSeconds,
        timeControlIncrementSeconds: session.game.timeControl.incrementSeconds ?? 0,
        rematchOpponentRequested: false,
        rematchRequestedByMe: false,
      }));

      setGameState(reviveGameState(session.game.state));
      onClose();
    } catch (e) {
      alert(String(e));
    }
  }

  async function handleFindGame() {
    try {
      setOnline((prev) => ({
        ...prev,
        matchmakingQueued: true,
        timeControlInitialSeconds: timeControl.initialSeconds,
        timeControlIncrementSeconds: timeControl.incrementSeconds ?? 0,
        clientName: name,
      }));
      const res = await enqueueMatchmaking({
        clientId: online.clientId,
        name: name || undefined,
        timeControl,
      });
      if (!res.enqueued) {
        // match may be immediate; subscription will deliver the matchFound event
      }
    } catch (e) {
      setOnline((prev) => ({ ...prev, matchmakingQueued: false }));
      alert(String(e));
    }
  }

  async function handleCancelFindGame() {
    try {
      await dequeueMatchmaking({ clientId: online.clientId });
    } catch {
      // ignore
    } finally {
      setOnline((prev) => ({ ...prev, matchmakingQueued: false }));
    }
  }

  async function handleResyncOnline() {
    if (!online.gameId) return;
    try {
      const session = await getGameSession({
        gameId: online.gameId,
        clientId: online.clientId,
      });
      setOnline((prev) => ({
        ...prev,
        code: session.code ?? null,
        playerColor: session.playerColor as ColorEnum,
        timeControlInitialSeconds: session.game.timeControl.initialSeconds,
        timeControlIncrementSeconds: session.game.timeControl.incrementSeconds ?? 0,
      }));
      setGameState(reviveGameState(session.game.state));
    } catch (e) {
      alert(String(e));
    }
  }

  async function handleQuitOnline() {
    if (!online.gameId) return;
    try {
      await quitGame({ clientId: online.clientId, gameId: online.gameId });
    } catch {
      // ignore
    } finally {
      setOnline((prev) => ({
        ...prev,
        enabled: false,
        matchmakingQueued: false,
        gameId: null,
        code: null,
        playerColor: null,
        rematchOpponentRequested: false,
        rematchRequestedByMe: false,
      }));
      setGameState(RESET);
      setGameState(GameHelper.newGame(300));
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
          <p>Time control</p>
          <select
            className="menu-select"
            value={timeLimit}
            onChange={(e) => setTimeLimit(parseInt(e.target.value))}
          >
            <option value={60}>1 min</option>
            <option value={300}>5 min</option>
            <option value={600}>10 min</option>
            <option value={900}>15 min</option>
          </select>

          <hr style={{ width: "100%" }} />

          <p>Online</p>
          <input
            className="menu-select"
            placeholder="Your name (optional)"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />

          {!online.enabled ? (
            <>
              <div className="menu-buttons">
                <button onClick={handleCreateInvite}>Create game (invite)</button>
              </div>
              <input
                className="menu-select"
                placeholder="Invite code (7 chars)"
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
              />
              <div className="menu-buttons">
                <button onClick={handleJoinInvite} disabled={code.trim().length < 7}>
                  Join by code
                </button>
              </div>

              {!online.matchmakingQueued ? (
                <div className="menu-buttons">
                  <button onClick={handleFindGame}>Find a game</button>
                </div>
              ) : (
                <div className="menu-buttons">
                  <button onClick={handleCancelFindGame}>Cancel search</button>
                </div>
              )}
            </>
          ) : (
            <>
              {online.code && (
                <p style={{ wordBreak: "break-all" }}>
                  Code: <b>{online.code}</b>
                </p>
              )}
              <p>
                You are: <b>{online.playerColor ?? "..."}</b>
              </p>
              <div className="menu-buttons">
                <button onClick={handleResyncOnline}>Resync</button>
                <button onClick={handleQuitOnline}>Quit game</button>
              </div>
            </>
          )}

          <hr style={{ width: "100%" }} />

          <p>Offline</p>
          <div className="menu-buttons">
            <button onClick={handleOfflineStart}>Start new match</button>
            <button onClick={onClose}>Continue</button>
            <button onClick={handleOfflineReset}>Clean Game</button>
          </div>
        </div>
      </div>
    </div>
  );
}
