import { useEffect, useRef } from "react";

const INITIAL_DELAY_MS = 500;
const MAX_DELAY_MS = 30_000;

function stripTrailingSlash(url) {
  return url.endsWith("/") ? url.slice(0, -1) : url;
}

export default function useVotingSocket({
  projectId,
  token,
  onVoteSubmitted,
  onVotingComplete,
}) {
  const callbacksRef = useRef({ onVoteSubmitted, onVotingComplete });

  useEffect(() => {
    callbacksRef.current = { onVoteSubmitted, onVotingComplete };
  }, [onVoteSubmitted, onVotingComplete]);

  useEffect(() => {
    if (!projectId || !token) return;

    const wsFromEnv = import.meta.env.VITE_WS_BASE_URL;
    const apiBaseUrl = import.meta.env.VITE_API_BASE_URL;

    let wsBaseUrl = "";
    if (wsFromEnv) {
      wsBaseUrl = stripTrailingSlash(wsFromEnv);
    } else if (apiBaseUrl) {
      wsBaseUrl = stripTrailingSlash(apiBaseUrl.replace(/^http/, "ws").replace(/\/api$/, ""));
    } else {
      wsBaseUrl = stripTrailingSlash(window.location.origin.replace(/^http/, "ws"));
    }

    const url = `${wsBaseUrl}/ws/${projectId}?token=${encodeURIComponent(token)}`;

    let ws = null;
    let cancelled = false;
    let attempt = 0;
    let reconnectTimer = null;

    const connect = () => {
      if (cancelled) return;
      ws = new WebSocket(url);

      ws.onopen = () => {
        attempt = 0;
      };

      ws.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data);
          if (msg?.type === "vote_submitted") {
            callbacksRef.current.onVoteSubmitted?.(msg);
          }
          if (msg?.type === "voting_complete") {
            callbacksRef.current.onVotingComplete?.(msg);
          }
        } catch {
          // ignore malformed messages
        }
      };

      ws.onclose = () => {
        if (cancelled) return;
        const delay = Math.min(MAX_DELAY_MS, INITIAL_DELAY_MS * 2 ** attempt);
        attempt += 1;
        reconnectTimer = setTimeout(connect, delay);
      };

      ws.onerror = () => {
        try {
          ws.close();
        } catch {
          // ignore
        }
      };
    };

    connect();

    return () => {
      cancelled = true;
      if (reconnectTimer) clearTimeout(reconnectTimer);
      if (ws) ws.close();
    };
  }, [projectId, token]);
}

