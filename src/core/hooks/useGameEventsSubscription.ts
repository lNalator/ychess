"use client";

import { useEffect } from "react";
import { useAtom } from "jotai";
import { gameStateAtom, reviveGameState } from "../data/gameState";
import { onlineGameAtom } from "../data/onlineGame";
import { graphqlSubscribe } from "../api/graphqlWs";
import { GAME_FIELDS, GqlGame, getGameSession } from "../api/gameApi";
import { ColorEnum } from "../enums/color.enum";

type GameEventData = {
  gameEvents: {
    type: string;
    gameId: string;
    at: string;
    message?: string | null;
    graceSeconds?: number | null;
    deadlineAt?: string | null;
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
          viewColor: session.playerColor as ColorEnum,
          timeControlInitialSeconds: session.game.timeControl.initialSeconds,
          timeControlIncrementSeconds:
            session.game.timeControl.incrementSeconds ?? 0,
          disconnect:
            session.game.disconnectingClientId &&
            session.game.disconnectDeadlineAt &&
            session.game.disconnectingClientId !== prev.clientId
              ? {
                  clientId: session.game.disconnectingClientId,
                  deadlineAt: session.game.disconnectDeadlineAt,
                  graceSeconds: session.game.disconnectGraceSeconds,
                }
              : null,
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
          graceSeconds
          deadlineAt
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
          setOnline((prev) => ({
            ...prev,
            playerColor: myColor,
            viewColor: myColor,
          }));
        }

        if (event.type === "PLAYER_DISCONNECTED") {
          const disconnectedId = event.player?.id;
          const deadlineAt = event.deadlineAt;
          const graceSeconds = event.graceSeconds;
          if (
            disconnectedId &&
            deadlineAt &&
            typeof graceSeconds === "number" &&
            disconnectedId !== online.clientId
          ) {
            setOnline((prev) => ({
              ...prev,
              disconnect: { clientId: disconnectedId, deadlineAt, graceSeconds },
            }));
          }
        }

        if (event.type === "PLAYER_RECONNECTED") {
          setOnline((prev) => ({ ...prev, disconnect: null }));
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
            disconnect: null,
          }));
        }

        if (event.type === "GAME_ENDED") {
          setOnline((prev) => ({ ...prev, disconnect: null }));
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
