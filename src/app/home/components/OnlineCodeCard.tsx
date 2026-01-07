import React from "react";

type Props = {
  name: string;
  code: string;
  timeLimit: number;
  onNameChange: (value: string) => void;
  onCodeChange: (value: string) => void;
  onTimeLimitChange: (value: number) => void;
  onCreate: () => void;
  onJoin: () => void;
  onBack: () => void;
};

export function OnlineCodeCard({
  name,
  code,
  timeLimit,
  onNameChange,
  onCodeChange,
  onTimeLimitChange,
  onCreate,
  onJoin,
  onBack,
}: Props) {
  return (
    <div className="home-card">
      <h2>Online with a Code</h2>
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
        <button className="home-btn" onClick={onCreate}>
          Create Invite Game
        </button>
      </div>

      <label className="home-label">
        Code
        <input
          className="home-input"
          placeholder="7 characters"
          value={code}
          onChange={(e) => onCodeChange(e.target.value.toUpperCase())}
        />
      </label>
      <div className="home-actions">
        <button className="home-btn" disabled={code.trim().length < 7} onClick={onJoin}>
          Join Game
        </button>
      </div>

      <button className="home-link" onClick={onBack}>
        Back
      </button>
    </div>
  );
}
