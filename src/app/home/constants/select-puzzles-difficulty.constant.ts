import { PuzzlesDifficultyEnum } from "@/shared/enums/puzzles-difficulty.enum";

export const SelectPuzzlesDifficultyConstant: { value: PuzzlesDifficultyEnum, label: string }[] = [
    {
        value: PuzzlesDifficultyEnum.easiest,
        label: 'Très facile',
    },
    {
        value: PuzzlesDifficultyEnum.easier,
        label: 'Facile',
    },
    {
        value: PuzzlesDifficultyEnum.normal,
        label: 'Normale',
    },
    {
        value: PuzzlesDifficultyEnum.harder,
        label: 'Difficile',
    },
    {
        value: PuzzlesDifficultyEnum.hardest,
        label: 'Très difficile',
    },
]