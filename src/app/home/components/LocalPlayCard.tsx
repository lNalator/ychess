import React from "react";

type Props = {
  timeLimit: number;
  onTimeLimitChange: (value: number) => void;
  onPlay: () => void;
  onBack: () => void;
};

export function LocalPlayCard({ timeLimit, onTimeLimitChange, onPlay, onBack }: Props) {
  return (
    <div className="home-card">
      <h2>Play Locally</h2>
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
        <button className="home-btn" onClick={onPlay}>
          Local vs Friend
        </button>
        <button className="home-btn" disabled>
          Vs Bot (soon)
        </button>
        <button className="home-btn" disabled>
          Chess Problems (soon)
        </button>
      </div>
      <button className="home-link" onClick={onBack}>
        Back
      </button>
    </div>
  );
}
