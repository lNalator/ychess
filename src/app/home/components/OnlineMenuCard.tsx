import React from "react";

type Props = {
  onCode: () => void;
  onMatchmaking: () => void;
  onBack: () => void;
};

export function OnlineMenuCard({ onCode, onMatchmaking, onBack }: Props) {
  return (
    <div className="home-card">
      <h2>Play Online</h2>
      <div className="home-actions">
        <button className="home-btn" onClick={onCode}>
          Online with a Code
        </button>
        <button className="home-btn" onClick={onMatchmaking}>
          Online Matchmaking
        </button>
      </div>
      <button className="home-link" onClick={onBack}>
        Back
      </button>
    </div>
  );
}
