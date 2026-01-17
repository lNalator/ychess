"use client";

import "./page.css";
import React from "react";
import { useHomeController } from "./home/useHomeController";
import { RootMenu } from "./home/components/RootMenu";
import { LocalPlayCard } from "./home/components/LocalPlayCard";
import { OnlineMenuCard } from "./home/components/OnlineMenuCard";
import { OnlineCodeCard } from "./home/components/OnlineCodeCard";
import { OnlineMatchmakingCard } from "./home/components/OnlineMatchmakingCard";
import { PuzzlesMenuCard } from "./home/components/PuzzlesMenuCard";

export default function HomePage() {
  const {
    view,
    setView,
    timeLimit,
    setTimeLimit,
    name,
    setName,
    code,
    setCode,
    online,
    puzzlesDifficulty,
    setPuzzlesDifficulty,
    puzzlesTheme,
    setPuzzlesTheme,
    startLocalVsFriend,
    startOnlineCreateInvite,
    startOnlineJoinInvite,
    startOnlineMatchmaking,
    cancelOnlineMatchmaking,
    startPuzzles,
  } = useHomeController();

  return (
    <main className="home-root">
      <h1 className="home-title">YChess</h1>

      {view === "root" && 
        <RootMenu 
          onLocal={() => setView("local")} 
          onOnline={() => setView("online")}
          onPuzzles={() => setView("puzzles")}
        />
      }

      {view === "local" && (
        <LocalPlayCard
          timeLimit={timeLimit}
          onTimeLimitChange={setTimeLimit}
          onPlay={startLocalVsFriend}
          onBack={() => setView("root")}
        />
      )}

      {view === "online" && (
        <OnlineMenuCard
          onCode={() => setView("online-code")}
          onMatchmaking={() => setView("online-matchmaking")}
          onBack={() => setView("root")}
        />
      )}

      {view === "online-code" && (
        <OnlineCodeCard
          name={name}
          code={code}
          timeLimit={timeLimit}
          onNameChange={setName}
          onCodeChange={setCode}
          onTimeLimitChange={setTimeLimit}
          onCreate={() => startOnlineCreateInvite().catch((e) => alert(String(e)))}
          onJoin={() => startOnlineJoinInvite().catch((e) => alert(String(e)))}
          onBack={() => setView("online")}
        />
      )}

      {view === "online-matchmaking" && (
        <OnlineMatchmakingCard
          name={name}
          timeLimit={timeLimit}
          matchmakingQueued={online.matchmakingQueued}
          realtimeStatus={online.realtimeStatus}
          lastError={online.lastRealtimeError}
          onNameChange={setName}
          onTimeLimitChange={setTimeLimit}
          onFind={() => startOnlineMatchmaking().catch((e) => alert(String(e)))}
          onCancel={cancelOnlineMatchmaking}
          onBack={() => setView("online")}
        />
      )}

      {view === "puzzles" && (
        <PuzzlesMenuCard
          puzzlesDifficulty={puzzlesDifficulty}
          puzzlesTheme={puzzlesTheme}
          onPuzzlesDifficultyChange={setPuzzlesDifficulty}
          onPuzzlesThemesChange={setPuzzlesTheme}
          onPlay={startPuzzles}
          onBack={() => setView("root")}
        />
      )}
    </main>
  );
}
