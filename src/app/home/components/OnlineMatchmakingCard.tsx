import React from "react";

type Props = {
  name: string;
  timeLimit: number;
  matchmakingQueued: boolean;
  realtimeStatus: string | null;
  lastError: string | null;
  onNameChange: (value: string) => void;
  onTimeLimitChange: (value: number) => void;
  onFind: () => void;
  onCancel: () => void;
  onBack: () => void;
};

export function OnlineMatchmakingCard({
  name,
  timeLimit,
  matchmakingQueued,
  realtimeStatus,
  lastError,
  onNameChange,
  onTimeLimitChange,
  onFind,
  onCancel,
  onBack,
}: Props) {
  return (
    <div className="home-card">
      <h2>Online Matchmaking</h2>
      <label className="home-label">
        Your name (optional)
        <input className="home-input" value={name} onChange={(e) => onNameChange(e.target.value)} />
      </label>
      <label className="home-label">
        Time control
        <select
          className="home-select"
          value={timeLimit}
          onChange={(e) => onTimeLimitChange(parseInt(e.target.value))}
        >
          <option value={60}>1 min</option>
          <option value={300}>5 min</option>
          <option value={600}>10 min</option>
          <option value={900}>15 min</option>
        </select>
      </label>

      <div className="home-actions">
        <button className="home-btn" onClick={onFind} disabled={matchmakingQueued}>
          Find a Game
        </button>
      </div>

      {matchmakingQueued && (
        <>
          <p className="home-muted">
            {realtimeStatus === "match_found" ? "Match found, confirming..." : "Searching... (keep this tab open)"}
          </p>
          {lastError && (
            <p className="home-muted" style={{ color: "#ffb4b4" }}>
              {lastError}
            </p>
          )}
          <div className="home-actions">
            <button className="home-btn" onClick={onCancel}>
              Cancel search
            </button>
          </div>
        </>
      )}

      <button className="home-link" onClick={onBack}>
        Back
      </button>
    </div>
  );
}
