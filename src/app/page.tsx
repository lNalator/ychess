"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useAtom } from "jotai";
import "./page.css";
import { gameStateAtom } from "@/core/data/gameState";
import { reviveGameState } from "@/core/data/gameState";
import { onlineGameAtom } from "@/core/data/onlineGame";
import { GameHelper } from "@/core/helpers/game.helper";
import { RESET } from "jotai/utils";
import {
  createInviteGame,
  dequeueMatchmaking,
  enqueueMatchmaking,
  joinInviteGame,
} from "@/core/api/gameApi";
import { ColorEnum } from "@/core/enums/color.enum";
import { useMatchmakingEventsSubscription } from "@/core/hooks/useMatchmakingEventsSubscription";

type HomeView =
  | "root"
  | "local"
  | "online"
  | "online-code"
  | "online-matchmaking";

export default function HomePage() {
  const router = useRouter();
  const [, setGameState] = useAtom(gameStateAtom);
  const [online, setOnline] = useAtom(onlineGameAtom);

  const [view, setView] = useState<HomeView>("root");
  const [timeLimit, setTimeLimit] = useState(300);
  const [name, setName] = useState("");
  const [code, setCode] = useState("");

  const timeControl = useMemo(
    () => ({ initialSeconds: timeLimit, incrementSeconds: 0 }),
    [timeLimit]
  );

  useEffect(() => {
    // Home must reset any game session.
    setOnline((prev) => ({
      ...prev,
      enabled: false,
      readOnly: false,
      viewColor: null,
      playerColor: null,
      gameId: null,
      code: null,
      matchmakingQueued: false,
      rematchOpponentRequested: false,
      rematchRequestedByMe: false,
      disconnect: null,
    }));
    setGameState(RESET);
    setGameState(GameHelper.newGame(300));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function startLocalVsFriend() {
    setOnline((prev) => ({
      ...prev,
      enabled: false,
      readOnly: false,
      viewColor: null,
      playerColor: null,
      gameId: null,
      code: null,
      matchmakingQueued: false,
      disconnect: null,
    }));
    setGameState(RESET);
    setGameState(GameHelper.newGame(timeLimit));
    router.push("/game");
  }

  async function startOnlineCreateInvite() {
    const session = await createInviteGame({
      clientId: online.clientId,
      name: name || undefined,
      timeControl,
    });

    setOnline((prev) => ({
      ...prev,
      enabled: true,
      readOnly: false,
      matchmakingQueued: false,
      gameId: session.gameId,
      code: session.code ?? null,
      clientName: name,
      playerColor: session.playerColor as ColorEnum,
      viewColor: session.playerColor as ColorEnum,
      timeControlInitialSeconds: session.game.timeControl.initialSeconds,
      timeControlIncrementSeconds: session.game.timeControl.incrementSeconds ?? 0,
      rematchOpponentRequested: false,
      rematchRequestedByMe: false,
      disconnect: null,
    }));

    setGameState(reviveGameState(session.game.state));

    if (session.code) {
      window.prompt("Invite code (share this):", session.code);
    }
    router.push("/game");
  }

  async function startOnlineJoinInvite() {
    const session = await joinInviteGame({
      clientId: online.clientId,
      name: name || undefined,
      code: code.trim(),
    });

    setOnline((prev) => ({
      ...prev,
      enabled: true,
      readOnly: false,
      matchmakingQueued: false,
      gameId: session.gameId,
      code: session.code ?? null,
      clientName: name,
      playerColor: session.playerColor as ColorEnum,
      viewColor: session.playerColor as ColorEnum,
      timeControlInitialSeconds: session.game.timeControl.initialSeconds,
      timeControlIncrementSeconds: session.game.timeControl.incrementSeconds ?? 0,
      rematchOpponentRequested: false,
      rematchRequestedByMe: false,
      disconnect: null,
    }));

    setGameState(reviveGameState(session.game.state));
    router.push("/game");
  }

  async function startOnlineMatchmaking() {
    setOnline((prev) => ({
      ...prev,
      enabled: false,
      readOnly: false,
      viewColor: null,
      playerColor: null,
      gameId: null,
      code: null,
      matchmakingQueued: true,
      clientName: name,
      timeControlInitialSeconds: timeControl.initialSeconds,
      timeControlIncrementSeconds: timeControl.incrementSeconds ?? 0,
      rematchOpponentRequested: false,
      rematchRequestedByMe: false,
      disconnect: null,
    }));

    await enqueueMatchmaking({
      clientId: online.clientId,
      name: name || undefined,
      timeControl,
    });
  }

  async function cancelOnlineMatchmaking() {
    try {
      await dequeueMatchmaking({ clientId: online.clientId });
    } catch {
      // ignore
    } finally {
      setOnline((prev) => ({ ...prev, matchmakingQueued: false }));
    }
  }

  return (
    <main className="home-root">
      <h1 className="home-title">YChess</h1>

      {view === "root" && (
        <div className="home-card">
          <h2>Play</h2>
          <div className="home-actions">
            <button className="home-btn" onClick={() => setView("local")}>
              Play Locally
            </button>
            <button className="home-btn" onClick={() => setView("online")}>
              Play Online
            </button>
          </div>
        </div>
      )}

      {view === "local" && (
        <div className="home-card">
          <h2>Play Locally</h2>
          <label className="home-label">
            Time control
            <select
              className="home-select"
              value={timeLimit}
              onChange={(e) => setTimeLimit(parseInt(e.target.value))}
            >
              <option value={60}>1 min</option>
              <option value={300}>5 min</option>
              <option value={600}>10 min</option>
              <option value={900}>15 min</option>
            </select>
          </label>
          <div className="home-actions">
            <button className="home-btn" onClick={startLocalVsFriend}>
              Local vs Friend
            </button>
            <button className="home-btn" disabled>
              Vs Bot (soon)
            </button>
            <button className="home-btn" disabled>
              Chess Problems (soon)
            </button>
          </div>
          <button className="home-link" onClick={() => setView("root")}>
            Back
          </button>
        </div>
      )}

      {view === "online" && (
        <div className="home-card">
          <h2>Play Online</h2>
          <div className="home-actions">
            <button className="home-btn" onClick={() => setView("online-code")}>
              Online with a Code
            </button>
            <button
              className="home-btn"
              onClick={() => setView("online-matchmaking")}
            >
              Online Matchmaking
            </button>
          </div>
          <button className="home-link" onClick={() => setView("root")}>
            Back
          </button>
        </div>
      )}

      {view === "online-code" && (
        <div className="home-card">
          <h2>Online with a Code</h2>
          <label className="home-label">
            Your name (optional)
            <input
              className="home-input"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </label>
          <label className="home-label">
            Time control
            <select
              className="home-select"
              value={timeLimit}
              onChange={(e) => setTimeLimit(parseInt(e.target.value))}
            >
              <option value={60}>1 min</option>
              <option value={300}>5 min</option>
              <option value={600}>10 min</option>
              <option value={900}>15 min</option>
            </select>
          </label>

          <div className="home-actions">
            <button
              className="home-btn"
              onClick={() => startOnlineCreateInvite().catch((e) => alert(String(e)))}
            >
              Create Invite Game
            </button>
          </div>

          <label className="home-label">
            Code
            <input
              className="home-input"
              placeholder="7 characters"
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
            />
          </label>
          <div className="home-actions">
            <button
              className="home-btn"
              disabled={code.trim().length < 7}
              onClick={() => startOnlineJoinInvite().catch((e) => alert(String(e)))}
            >
              Join Game
            </button>
          </div>

          <button className="home-link" onClick={() => setView("online")}>
            Back
          </button>
        </div>
      )}

      {view === "online-matchmaking" && (
        <div className="home-card">
          <h2>Online Matchmaking</h2>
          <label className="home-label">
            Your name (optional)
            <input
              className="home-input"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </label>
          <label className="home-label">
            Time control
            <select
              className="home-select"
              value={timeLimit}
              onChange={(e) => setTimeLimit(parseInt(e.target.value))}
            >
              <option value={60}>1 min</option>
              <option value={300}>5 min</option>
              <option value={600}>10 min</option>
              <option value={900}>15 min</option>
            </select>
          </label>

          <div className="home-actions">
            <button
              className="home-btn"
              onClick={() => startOnlineMatchmaking().catch((e) => alert(String(e)))}
              disabled={online.matchmakingQueued}
            >
              Find a Game
            </button>
          </div>

          {online.matchmakingQueued && (
            <>
              <MatchmakingListener />
              <p className="home-muted">Searching... (keep this tab open)</p>
              <div className="home-actions">
                <button className="home-btn" onClick={() => cancelOnlineMatchmaking()}>
                  Cancel search
                </button>
              </div>
            </>
          )}

          <button className="home-link" onClick={() => setView("online")}>
            Back
          </button>
        </div>
      )}
    </main>
  );
}

function MatchmakingListener() {
  useMatchmakingEventsSubscription();
  const router = useRouter();
  const [online] = useAtom(onlineGameAtom);

  useEffect(() => {
    if (online.enabled && online.gameId) router.push("/game");
  }, [online.enabled, online.gameId, router]);

  return null;
}
