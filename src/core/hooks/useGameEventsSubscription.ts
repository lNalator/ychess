"use client";

import { useEffect, useRef } from "react";
import { useGameState } from "../data/gameState";
import { useOnlineGame } from "../data/onlineGame";
import { graphqlSubscribe } from "../api/graphqlWs";
import {
  buildGameStateFromGame,
  clientReady,
  GqlGameEvent,
  getGameSession,
  notifyDisconnect,
  notifyReconnect,
} from "../api/gameApi";
import { ColorEnum } from "../enums/color.enum";

type GameEventData = {
  gameEvents: GqlGameEvent;
};

function isGameEventData(value: unknown): value is GameEventData {
  const isRecord = (v: unknown): v is Record<string, unknown> =>
    typeof v === "object" && v !== null;

  const obj = value as Record<string, unknown>;
  if (!isRecord(obj)) return false;

  const gameEvents = obj["gameEvents"];
  if (!isRecord(gameEvents)) return false;

  return (
    typeof gameEvents["type"] === "string" &&
    typeof gameEvents["gameId"] === "string"
  );
}

export function useGameEventsSubscription() {
  const [online, setOnline] = useOnlineGame();
  const [, setGameState] = useGameState();
  const resyncedRef = useRef(false);
  const connectedRef = useRef(false);
  const readyCycleRef = useRef<string | null>(null);
  const gameStatusRef = useRef<string | null>(null);
  const gameUpdatedAtRef = useRef<string | null>(null);
  const readyDeadlineRef = useRef<string | null>(null);

  useEffect(() => {
    if (!online.enabled || !online.gameId) return;

    const deriveRealtimeStatus = (status: string | null | undefined) => {
      switch (status) {
        case "RUNNING":
          return "in_game";
        case "READY_CHECK":
        case "WAITING_FOR_PLAYER":
        case "CREATED":
          return "waiting_ready";
        case "ENDED":
          return "in_game";
        default:
          return "waiting_ready";
      }
    };

    let cancelled = false;
    resyncedRef.current = false;
    connectedRef.current = false;
    readyDeadlineRef.current = null;
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
          gameStatus: session.game.status,
          realtimeStatus: deriveRealtimeStatus(session.game.status),
          lastRealtimeError: null,
          timeControlInitialSeconds: session.game.timeControl.initialSeconds,
          timeControlIncrementSeconds: session.game.timeControl.incrementSeconds ?? 0,
          disconnect: null,
        }));
        gameStatusRef.current = session.game.status;
        gameUpdatedAtRef.current = new Date().toISOString();
        setGameState(buildGameStateFromGame(session.game));
        resyncedRef.current = true;
      } catch (e) {
        console.warn("resync error", e);
        setOnline((prev) => ({
          ...prev,
          realtimeStatus: "error",
          lastRealtimeError: String(e),
        }));
      }
    })();

    const query = `
      subscription GameEvents($gameId: ID!, $clientId: ID!) {
        gameEvents(gameId: $gameId, clientId: $clientId) {
          type
          gameId
          at
          message
          targetClientId
          errorCode
          deadlineAt
          playerId
          playerColor
          move { by playedAt from { vertical horizontal } to { vertical horizontal } promotion }
          clock { whiteSeconds blackSeconds }
        }
      }
    `;

    const unsubscribe = graphqlSubscribe<GameEventData>({
      query,
      variables: { gameId: online.gameId, clientId: online.clientId },
      connectionParams: { clientId: online.clientId },
      onConnected: () => {
        connectedRef.current = true;
        notifyReconnect({ clientId: online.clientId, gameId: online.gameId! }).catch(() => undefined);
      },
      onData: (data) => {
        if (!isGameEventData(data)) {
          setOnline((prev) => ({
            ...prev,
            realtimeStatus: "error",
            lastRealtimeError: "Invalid gameEvents payload",
          }));
          return;
        }

        const event = data.gameEvents;
        // For every event, resync current game state (authoritative).
        getGameSession({ gameId: online.gameId!, clientId: online.clientId })
          .then((session) => {
            setGameState(buildGameStateFromGame(session.game));
            const me = session.game.players.find((p) => p.id === online.clientId);
            const myColor = me?.color as ColorEnum | undefined;
            if (myColor && online.playerColor !== myColor) {
              setOnline((prev) => ({
                ...prev,
                playerColor: myColor,
                viewColor: myColor,
              }));
            }
            setOnline((prev) => ({
              ...prev,
              gameStatus: session.game.status,
              realtimeStatus: deriveRealtimeStatus(session.game.status),
              drawOfferedByMe: false,
              drawOfferedByOpponent: false,
            }));
            gameStatusRef.current = session.game.status;
            gameUpdatedAtRef.current = new Date().toISOString();
          })
          .catch((e) =>
            setOnline((prev) => ({
              ...prev,
              realtimeStatus: "error",
              lastRealtimeError: String(e),
            }))
          );

        if (event.type === "ERROR_OCCURRED") {
          setOnline((prev) => ({
            ...prev,
            realtimeStatus: "error",
            lastRealtimeError: event.message ?? event.errorCode ?? "Realtime error",
          }));
          return;
        }

        if (
          event.type === "READY_CHECK_STARTED" &&
          event.targetClientId === online.clientId &&
          event.deadlineAt
        ) {
          readyDeadlineRef.current = event.deadlineAt;
          setOnline((prev) => ({ ...prev, realtimeStatus: "syncing" }));
        }

        if (event.type === "PLAYER_DISCONNECTED" && event.playerId) {
          const deadline = event.deadlineAt ?? null;
          setOnline((prev) => ({
            ...prev,
            disconnect: {
              clientId: event.playerId!,
              graceSeconds: deadline ? Math.max(0, Math.floor((new Date(deadline).getTime() - Date.now()) / 1000)) : 0,
              deadlineAt: deadline ?? new Date(Date.now() + 15000).toISOString(),
            },
          }));
        }

        if (event.type === "PLAYER_RECONNECTED" && event.playerId) {
          setOnline((prev) => ({
            ...prev,
            disconnect: prev.disconnect && prev.disconnect.clientId === event.playerId ? null : prev.disconnect,
          }));
        }

        if (event.type === "DRAW_OFFERED" && event.playerId && event.playerId !== online.clientId) {
          setOnline((prev) => ({ ...prev, drawOfferedByOpponent: true }));
        }
      },
      onError: (err) => {
        console.warn("subscription error", err);
        if (online.gameId) {
          notifyDisconnect({ clientId: online.clientId, gameId: online.gameId }).catch(() => undefined);
        }
        setOnline((prev) => ({
          ...prev,
          realtimeStatus: "error",
          lastRealtimeError: String(err),
        }));
      },
    });

    (async () => {
      while (!cancelled) {
        if (connectedRef.current && resyncedRef.current) {
          const status = gameStatusRef.current;
          if (status === "READY_CHECK") {
            const cycleKey = `${online.gameId}:${readyDeadlineRef.current ?? gameUpdatedAtRef.current ?? ""}`;
            if (readyCycleRef.current === cycleKey) {
              await new Promise((r) => setTimeout(r, 50));
              continue;
            }
            readyCycleRef.current = cycleKey;
            try {
              setOnline((prev) => ({ ...prev, realtimeStatus: "syncing" }));
              await clientReady({ gameId: online.gameId!, clientId: online.clientId });
              setOnline((prev) => ({
                ...prev,
                realtimeStatus: "waiting_ready",
              }));
            } catch (e) {
              setOnline((prev) => ({
                ...prev,
                realtimeStatus: "error",
                lastRealtimeError: String(e),
              }));
            }
          }
        }
        await new Promise((r) => setTimeout(r, 50));
      }
    })();

    return () => {
      cancelled = true;
      unsubscribe();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [online.enabled, online.gameId, online.clientId]);

  return { online };
}
