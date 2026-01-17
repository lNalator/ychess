import { PuzzlesDifficultyEnum } from "@/shared/enums/puzzles-difficulty.enum";
import { PuzzlesThemesEnum } from "@/shared/enums/puzzles-themes.enum";
import React from "react";
import { SelectPuzzlesDifficultyConstant } from "../constants/select-puzzles-difficulty.constant";
import { SelectPuzzlesThemeConstant } from "../constants/select-puzzles-theme.constant";

type Props = {
  puzzlesDifficulty: PuzzlesDifficultyEnum;
  puzzlesTheme: PuzzlesThemesEnum;
  onPuzzlesDifficultyChange: (value: PuzzlesDifficultyEnum) => void;
  onPuzzlesThemesChange: (value: PuzzlesThemesEnum) => void;
  onPlay: () => void;
  onBack: () => void;
};

export function PuzzlesMenuCard(
    {
        puzzlesDifficulty, 
        puzzlesTheme, 
        onPuzzlesDifficultyChange,
        onPuzzlesThemesChange,
        onPlay,
        onBack,
    }: Props
) {
    return (
        <div className="home-card">
            <h2>Puzzles</h2>
            <label className="home-label">
                Difficulty
                <select
                className="home-select"
                value={puzzlesDifficulty}
                onChange={(e) => onPuzzlesDifficultyChange(e.target.value as PuzzlesDifficultyEnum)}
                >
                    {
                        SelectPuzzlesDifficultyConstant.map((item) => (
                            <option key={item.value} value={item.value}>{item.label}</option>
                        ))
                    }
                </select>
            </label>
            <label className="home-label">
                Theme
                <select
                className="home-select"
                value={puzzlesTheme}
                onChange={(e) => onPuzzlesThemesChange(e.target.value as PuzzlesThemesEnum)}
                >
                    {
                        SelectPuzzlesThemeConstant.map((item) => (
                            <option key={item.value} value={item.value}>{item.label}</option>
                        ))
                    }
                </select>
            </label>
            <div className="home-actions">
                <button className="home-btn" onClick={onPlay}>
                    Play
                </button>
            </div>
            <button className="home-link" onClick={onBack}>
                Back
            </button>
        </div>
    )
}