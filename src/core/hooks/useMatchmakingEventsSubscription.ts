"use client";

import { useEffect } from "react";
import { useAtom } from "jotai";
import { onlineGameAtom } from "../data/onlineGame";
import { graphqlSubscribe } from "../api/graphqlWs";
import { GAME_FIELDS, GqlMatchmakingEvent } from "../api/gameApi";
import { gameStateAtom, reviveGameState } from "../data/gameState";
import { ColorEnum } from "../enums/color.enum";

type MatchmakingData = {
  matchmakingEvents: GqlMatchmakingEvent;
};

export function useMatchmakingEventsSubscription() {
  const [online, setOnline] = useAtom(onlineGameAtom);
  const [, setGameState] = useAtom(gameStateAtom);

  useEffect(() => {
    if (!online.matchmakingQueued) return;

    const query = `
      subscription MatchmakingEvents($clientId: ID!) {
        matchmakingEvents(clientId: $clientId) {
          type
          at
          clientId
          gameId
          playerColor
          message
          game { ${GAME_FIELDS} }
        }
      }
    `;

    const unsubscribe = graphqlSubscribe<MatchmakingData>({
      query,
      variables: { clientId: online.clientId },
      connectionParams: { clientId: online.clientId },
      onData: (data) => {
        const event = data.matchmakingEvents;
        if (event.type === "MATCH_FOUND" && event.gameId && event.game) {
          setOnline((prev) => ({
            ...prev,
            enabled: true,
            readOnly: false,
            matchmakingQueued: false,
            gameId: event.gameId!,
            code: event.game.code ?? null,
            playerColor: (event.playerColor as ColorEnum) ?? null,
            viewColor: (event.playerColor as ColorEnum) ?? null,
            timeControlInitialSeconds: event.game.timeControl.initialSeconds,
            timeControlIncrementSeconds:
              event.game.timeControl.incrementSeconds ?? 0,
            rematchOpponentRequested: false,
            rematchRequestedByMe: false,
            disconnect: null,
          }));
          setGameState(reviveGameState(event.game.state));
        }
      },
      onError: (err) => console.warn("matchmaking subscription error", err),
    });

    return () => unsubscribe();
  }, [online.matchmakingQueued, online.clientId, setOnline, setGameState]);
}
