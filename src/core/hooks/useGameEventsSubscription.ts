"use client";

import { useEffect, useRef } from "react";
import { useAtom } from "jotai";
import { gameStateAtom, reviveGameState } from "../data/gameState";
import { onlineGameAtom } from "../data/onlineGame";
import { graphqlSubscribe } from "../api/graphqlWs";
import { clientReady, GAME_FIELDS, GqlGame, getGameSession } from "../api/gameApi";
import { ColorEnum } from "../enums/color.enum";

type GameEventData = {
  gameEvents: {
    type: string;
    gameId: string;
    at: string;
    message?: string | null;
    targetClientId?: string | null;
    errorCode?: string | null;
    graceSeconds?: number | null;
    timeoutSeconds?: number | null;
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

function isGameEventData(value: unknown): value is GameEventData {
  const isRecord = (v: unknown): v is Record<string, unknown> =>
    typeof v === "object" && v !== null;

  const obj = value as Record<string, unknown>;
  if (!isRecord(obj)) return false;

  const gameEvents = obj["gameEvents"];
  if (!isRecord(gameEvents)) return false;

  const game = gameEvents["game"];
  if (!isRecord(game)) return false;

  return (
    typeof gameEvents["type"] === "string" &&
    typeof gameEvents["gameId"] === "string" &&
    typeof game["id"] === "string"
  );
}

export function useGameEventsSubscription() {
  const [online, setOnline] = useAtom(onlineGameAtom);
  const [, setGameState] = useAtom(gameStateAtom);
  const resyncedRef = useRef(false);
  const connectedRef = useRef(false);
  const readyCycleRef = useRef<string | null>(null);
  const gameStatusRef = useRef<string | null>(null);
  const gameUpdatedAtRef = useRef<string | null>(null);
  const readyDeadlineRef = useRef<string | null>(null);

  useEffect(() => {
    if (!online.enabled || !online.gameId) return;

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
        console.log("Resynced game session:", session);
        if (cancelled) return;
        setOnline((prev) => ({
          ...prev,
          code: session.code ?? null,
          playerColor: session.playerColor as ColorEnum,
          viewColor: session.playerColor as ColorEnum,
          gameStatus: session.game.status,
          realtimeStatus:
            session.game.status === "IN_PROGRESS" ? "in_game" : "waiting_ready",
          lastRealtimeError: null,
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
        gameStatusRef.current = session.game.status;
        gameUpdatedAtRef.current = session.game.updatedAt;
        setGameState(reviveGameState(session.game.state));
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
          graceSeconds
          timeoutSeconds
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
      onConnected: () => {
        connectedRef.current = true;
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

        setOnline((prev) => ({
          ...prev,
          gameStatus: event.game.status,
          realtimeStatus:
            event.type === "GAME_STARTED" || event.game.status === "IN_PROGRESS"
              ? "in_game"
              : prev.realtimeStatus,
        }));
        gameStatusRef.current = event.game.status;
        gameUpdatedAtRef.current = event.game.updatedAt;

        if (event.type === "ERROR") {
          setOnline((prev) => ({
            ...prev,
            realtimeStatus: "error",
            lastRealtimeError: event.message ?? event.errorCode ?? "Realtime error",
          }));
          return;
        }

        if (
          event.type === "GAME_LOAD_REQUEST" &&
          event.targetClientId === online.clientId &&
          event.deadlineAt
        ) {
          readyDeadlineRef.current = event.deadlineAt;
          setOnline((prev) => ({ ...prev, realtimeStatus: "syncing" }));
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
              realtimeStatus:
                prev.gameStatus === "IN_PROGRESS" ? "in_game" : "waiting_ready",
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
