import { PuzzlesThemesEnum } from "@/shared/enums/puzzles-themes.enum";

export const SelectPuzzlesThemeConstant: { value: PuzzlesThemesEnum, label: string }[] = [
    {
        value: PuzzlesThemesEnum.None,
        label: 'Aucun',
    },
    {
        value: PuzzlesThemesEnum.Attraction,
        label: 'Attraction',
    },
    {
        value: PuzzlesThemesEnum.Checkmate,
        label: 'Mat',
    },
    {
        value: PuzzlesThemesEnum.Deflection,
        label: 'Dégagement',
    },
    {
        value: PuzzlesThemesEnum.Endgame,
        label: 'Fin de partie',
    },
    {
        value: PuzzlesThemesEnum.Fork,
        label: 'Fourchette',
    },
    {
        value: PuzzlesThemesEnum.Opening,
        label: 'Ouverture',
    },
    {
        value: PuzzlesThemesEnum.Promotion,
        label: 'Promotion',
    },
    {
        value: PuzzlesThemesEnum.Zugzwang,
        label: 'Zugzwang',
    },
]