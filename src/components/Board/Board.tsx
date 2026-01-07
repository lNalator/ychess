import "./board.css";
import Image from "next/image";
import { useState } from "react";
import Piece from "@/core/entities/piece.model";
import { GameState, useGameState } from "@/core/data/gameState";
import PlayerHelper from "@/core/helpers/player.helper";
import Position from "@/core/interfaces/position";
import { CastleEnum } from "@/core/enums/castle.enum";
import PiecesHelper from "@/core/helpers/pieces.helper";
import { ColorEnum } from "@/core/enums/color.enum";
import { useOnlineGame } from "@/core/data/onlineGame";
import { buildGameStateFromGame, makeMove } from "@/core/api/gameApi";

export default function Board() {
  const [gameState, setGameState] = useGameState();
  const [online] = useOnlineGame();
  const { players }: GameState = gameState;
  const playingPlayer = PlayerHelper.getPlayingPlayer(players);
  const notPlayingPlayer = PlayerHelper.getNotPlayingPlayer(players);

  const [selectedPiece, setSelectedPiece] = useState(null as Piece | null);
  const nbFiles = 8;

  const isOnline = online.enabled && !!online.gameId && !!online.clientId;
  const myColor = online.enabled ? online.playerColor : online.viewColor;
  const isReversed = myColor === ColorEnum.BLACK;
  const isWaitingForStart =
    online.enabled && online.gameStatus !== "RUNNING" && online.gameStatus !== "ENDED";
  const isReadOnly = online.readOnly || gameState.hasGameEnded || isWaitingForStart;
  const canPlayThisTurn =
    !online.enabled || (!isWaitingForStart && myColor && myColor === playingPlayer.color);

  const possibleMoves = () => {
    let possibleMoves: Array<Position> = [];
    if (isReadOnly) return possibleMoves;
    const canSelectPiece =
      selectedPiece &&
      selectedPiece.color === playingPlayer.color &&
      canPlayThisTurn &&
      (!online.enabled || selectedPiece.color === myColor);

    if (canSelectPiece) {
      possibleMoves = selectedPiece.getMovements(
        playingPlayer.pieces,
        notPlayingPlayer.pieces
      );

      possibleMoves = selectedPiece.getFilteredMovements(
        playingPlayer.pieces,
        notPlayingPlayer.pieces
      );
    }

    return possibleMoves;
  };

  const handleBoxClick = async (
    isPossibleMove: boolean,
    selectedPiece: Piece | null,
    piece: Piece | undefined,
    vertical: number,
    horizontal: number
  ) => {
    if (isReadOnly) return;
    if (selectedPiece && isPossibleMove && canPlayThisTurn) {
      if (isOnline) {
        try {
          const from = { ...selectedPiece.position };
          const to = { vertical, horizontal };
          const result = await makeMove({
            clientId: online.clientId,
            gameId: online.gameId!,
            from,
            to,
          });

          if (!result.ok) throw new Error("Move rejected by server");
          if (result.game) {
            setGameState(buildGameStateFromGame(result.game));
          }
        } catch (e) {
          alert(String(e));
        } finally {
          setSelectedPiece(null);
        }
        return;
      }

      const afterMovement = selectedPiece.move({ vertical, horizontal }, piece);
      if (afterMovement.hasEaten && afterMovement.ate) {
        PlayerHelper.eatPiece(playingPlayer, notPlayingPlayer, afterMovement.ate);
      }

      if (afterMovement?.castle === CastleEnum.SMALL) {
        PiecesHelper.moveRookForCastle(playingPlayer, selectedPiece, CastleEnum.SMALL);
      }
      if (afterMovement?.castle === CastleEnum.LARGE) {
        PiecesHelper.moveRookForCastle(playingPlayer, selectedPiece, CastleEnum.LARGE);
      }

      if (afterMovement?.enPassant) {
        PiecesHelper.eatEnPassant(selectedPiece, playingPlayer, notPlayingPlayer);
      }

      if (selectedPiece.name === "Pawn") {
        if (selectedPiece.color === ColorEnum.WHITE && vertical === 7) {
          PiecesHelper.pawnPromotion(selectedPiece, { vertical, horizontal }, playingPlayer);
        }
        if (selectedPiece.color === ColorEnum.BLACK && vertical === 0) {
          PiecesHelper.pawnPromotion(selectedPiece, { vertical, horizontal }, playingPlayer);
        }
      }

      if (PlayerHelper.cantPlay(notPlayingPlayer, playingPlayer.pieces)) {
        if (PiecesHelper.isKingInCheck(notPlayingPlayer.pieces, playingPlayer.pieces)) {
          playingPlayer.score++;
          setGameState({
            ...gameState,
            hasGameEnded: true,
            winner: playingPlayer,
            reason: { checkmate: true },
          });
          setSelectedPiece(null);
          PlayerHelper.switchPlayerTurn(players);
          return;
        } else {
          players.forEach((player) => {
            player.score += 0.5;
          });
          setGameState({
            ...gameState,
            hasGameEnded: true,
            winner: null,
            reason: { stalemate: true },
          });
          setSelectedPiece(null);
          PlayerHelper.switchPlayerTurn(players);
          return;
        }
      }

      setSelectedPiece(null);
      PlayerHelper.switchPlayerTurn(players);
      setGameState({ ...gameState });
    } else if (piece) {
      if (online.enabled) {
        if (!canPlayThisTurn) return;
        if (myColor && piece.color !== myColor) return;
      }
      setSelectedPiece(piece);
    } else {
      setSelectedPiece(null);
    }
  };

  return (
    <div className="grid">
      {[...Array(nbFiles)].map((_, vertical) => (
        <div key={vertical} className="row">
          {[...Array(nbFiles)].map((_, horizontal) => {
            const internalVertical = isReversed ? nbFiles - 1 - vertical : vertical;
            const internalHorizontal = isReversed ? nbFiles - 1 - horizontal : horizontal;

            const isPossibleMove = possibleMoves().some(
              (move: Position) =>
                move.vertical === internalVertical &&
                move.horizontal === internalHorizontal
            );

            const piece = PlayerHelper.getAllPieces(players).find(
              (p) =>
                p.position?.vertical === internalVertical &&
                p.position?.horizontal === internalHorizontal
            );

            return (
              <div
                key={vertical * 10 + horizontal}
                className={((vertical + horizontal) % 2 ? "light" : "dark") + " box"}
                onClick={() =>
                  handleBoxClick(
                    isPossibleMove,
                    selectedPiece,
                    piece,
                    internalVertical,
                    internalHorizontal
                  )
                }
              >
                <div
                  className={
                    (isPossibleMove ? "possible-move " : "") +
                    (piece ? "piece-exist" : "")
                  }
                ></div>
                {piece && (
                  <Image
                    src={`/imgs/${
                      Array.from(piece.color.toLowerCase())[0] + piece.name.toLowerCase()
                    }.png`}
                    fill={true}
                    sizes="max-width: 100px, max-height: 100px"
                    alt={piece.color + " " + piece.name}
                    className="piece"
                  />
                )}
              </div>
            );
          })}
        </div>
      ))}
    </div>
  );
}
