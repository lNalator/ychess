import React from "react";

type Props = {
  onLocal: () => void;
  onOnline: () => void;
  onPuzzles: () => void;
};

export function RootMenu({ onLocal, onOnline, onPuzzles }: Props) {
  return (
    <div className="home-card">
      <h2>Play</h2>
      <div className="home-actions">
        <button className="home-btn" onClick={onLocal}>
          Play Locally
        </button>
        <button className="home-btn" onClick={onOnline}>
          Play Online
        </button>
        <button className="home-btn" onClick={onPuzzles}>
          Puzzles
        </button>
      </div>
    </div>
  );
}
