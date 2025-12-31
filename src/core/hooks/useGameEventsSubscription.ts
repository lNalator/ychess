"use client";

import { useEffect } from "react";
import { useAtom } from "jotai";
import { gameStateAtom, reviveGameState } from "../data/gameState";
import { onlineGameAtom } from "../data/onlineGame";
import { graphqlSubscribe } from "../api/graphqlWs";
import { GAME_FIELDS, GqlGame, getGameSession } from "../api/gameApi";
import { ColorEnum } from "../enums/color.enum";
import { GameHelper } from "../helpers/game.helper";
import { RESET } from "jotai/utils";

type GameEventData = {
  gameEvents: {
    type: string;
    gameId: string;
    at: string;
    message?: string | null;
    game: GqlGame;
    player?: { id: string; name: string; color: string } | null;
    move?: {
      byPlayerId: string;
      playedAt: string;
      from: { vertical: number; horizontal: number };
      to: { vertical: number; horizontal: number };
      promotion?: string | null;
    } | null;
  };
};

export function useGameEventsSubscription() {
  const [online, setOnline] = useAtom(onlineGameAtom);
  const [, setGameState] = useAtom(gameStateAtom);

  useEffect(() => {
    if (!online.enabled || !online.gameId) return;

    let cancelled = false;
    (async () => {
      try {
        const session = await getGameSession({
          gameId: online.gameId!,
          clientId: online.clientId,
        });
        if (cancelled) return;
        setOnline((prev) => ({
          ...prev,
          code: session.code ?? null,
          playerColor: session.playerColor as ColorEnum,
          timeControlInitialSeconds: session.game.timeControl.initialSeconds,
          timeControlIncrementSeconds:
            session.game.timeControl.incrementSeconds ?? 0,
        }));
        setGameState(reviveGameState(session.game.state));
      } catch (e) {
        console.warn("resync error", e);
      }
    })();

    const query = `
      subscription GameEvents($gameId: ID!, $clientId: ID!) {
        gameEvents(gameId: $gameId, clientId: $clientId) {
          type
          gameId
          at
          message
          player { id name color }
          move { byPlayerId playedAt from { vertical horizontal } to { vertical horizontal } promotion }
          game { ${GAME_FIELDS} }
        }
      }
    `;

    const unsubscribe = graphqlSubscribe<GameEventData>({
      query,
      variables: { gameId: online.gameId, clientId: online.clientId },
      connectionParams: { clientId: online.clientId },
      onData: (data) => {
        const event = data.gameEvents;
        const state = event.game.state;
        setGameState(reviveGameState(state));

        const me = state.players.find((p) => p.id === online.clientId);
        const myColor = me?.color as ColorEnum | undefined;
        if (myColor && online.playerColor !== myColor) {
          setOnline((prev) => ({ ...prev, playerColor: myColor }));
        }

        if (event.type === "PLAYER_QUIT") {
          const quitterId = event.player?.id;
          if (quitterId && quitterId !== online.clientId) {
            alert("Opponent left the game.");
            setOnline((prev) => ({
              ...prev,
              enabled: false,
              gameId: null,
              code: null,
              playerColor: null,
              matchmakingQueued: false,
              rematchOpponentRequested: false,
              rematchRequestedByMe: false,
            }));
            setGameState(RESET);
            setGameState(GameHelper.newGame(300));
          }
        }

        if (event.type === "REMATCH_REQUESTED") {
          const requesterId = event.player?.id;
          if (requesterId && requesterId !== online.clientId) {
            setOnline((prev) => ({ ...prev, rematchOpponentRequested: true }));
          }
        }

        if (event.type === "REMATCH_DECLINED") {
          setOnline((prev) => ({
            ...prev,
            rematchOpponentRequested: false,
            rematchRequestedByMe: false,
          }));
        }

        if (event.type === "REMATCH_STARTED") {
          setOnline((prev) => ({
            ...prev,
            rematchOpponentRequested: false,
            rematchRequestedByMe: false,
          }));
        }
      },
      onError: (err) => {
        console.warn("subscription error", err);
      },
    });

    return () => {
      cancelled = true;
      unsubscribe();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [online.enabled, online.gameId, online.clientId]);

  return { online };
}
