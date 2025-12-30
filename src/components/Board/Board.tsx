import "./board.css";
import { useAtom } from "jotai";
import Image from "next/image";
import { useState } from "react";
import Piece from "@/core/entities/piece.model";
import { gameStateAtom, GameState } from "@/core/data/gameState";
import PlayerHelper from "@/core/helpers/player.helper";
import Position from "@/core/interfaces/position";
import { CastleEnum } from "@/core/enums/castle.enum";
import PiecesHelper from "@/core/helpers/pieces.helper";
import { ColorEnum } from "@/core/enums/color.enum";

export default function Board() {
  const [gameState, setGameState] = useAtom(gameStateAtom);
  const { players }: GameState = gameState;
  const playingPlayer = PlayerHelper.getPlayingPlayer(players);
  const notPlayingPlayer = PlayerHelper.getNotPlayingPlayer(players);

  const [selectedPiece, setSelectedPiece] = useState(null as Piece | null);
  const nbFiles = 8;

  const possibleMoves = () => {
    let possibleMoves: Array<Position> = [];
    if (selectedPiece && selectedPiece.color === playingPlayer.color) {
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

  const handleBoxClick = (
    isPossibleMove: boolean,
    selectedPiece: Piece | null,
    piece: Piece | undefined,
    vertical: number,
    horizontal: number
  ) => {
    if (
      selectedPiece &&
      selectedPiece.color === playingPlayer.color &&
      isPossibleMove
    ) {
      // Déplacer la pièce si la case est un mouvement possible
      const afterMovement = selectedPiece.move({ vertical, horizontal }, piece);
      if (afterMovement.hasEaten && afterMovement.ate) {
        PlayerHelper.eatPiece(
          playingPlayer,
          notPlayingPlayer,
          afterMovement.ate
        );
      }

      if (afterMovement?.castle === CastleEnum.SMALL) {
        PiecesHelper.moveRookForCastle(
          playingPlayer,
          selectedPiece,
          CastleEnum.SMALL
        );
      }
      if (afterMovement?.castle === CastleEnum.LARGE) {
        PiecesHelper.moveRookForCastle(
          playingPlayer,
          selectedPiece,
          CastleEnum.LARGE
        );
      }

      if (afterMovement?.enPassant) {
        PiecesHelper.eatEnPassant(
          selectedPiece,
          playingPlayer,
          notPlayingPlayer
        );
      }

      if (selectedPiece.name === "Pawn") {
        if (selectedPiece.color === ColorEnum.WHITE && vertical === 7) {
          PiecesHelper.pawnPromotion(
            selectedPiece,
            { vertical, horizontal },
            playingPlayer
          );
        }
        if (selectedPiece.color === ColorEnum.BLACK && vertical === 0) {
          PiecesHelper.pawnPromotion(
            selectedPiece,
            { vertical, horizontal },
            playingPlayer
          );
        }
      }

      if (PlayerHelper.cantPlay(notPlayingPlayer, playingPlayer.pieces)) {
        if (
          PiecesHelper.isKingInCheck(
            notPlayingPlayer.pieces,
            playingPlayer.pieces
          )
        ) {
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
            const isPossibleMove = possibleMoves().some(
              (move: Position) =>
                move.vertical === vertical && move.horizontal === horizontal
            );

            const piece = PlayerHelper.getAllPieces(players).find(
              (p) =>
                p.position?.vertical === vertical &&
                p.position?.horizontal === horizontal
            );

            return (
              <div
                key={vertical * 10 + horizontal}
                className={
                  ((vertical + horizontal) % 2 ? "light" : "dark") + " box"
                }
                onClick={() =>
                  handleBoxClick(
                    isPossibleMove,
                    selectedPiece,
                    piece,
                    vertical,
                    horizontal
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
                      Array.from(piece.color.toLowerCase())[0] +
                      piece.name.toLowerCase()
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
