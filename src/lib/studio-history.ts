import { useSyncExternalStore } from "react";

type State<M> = { messages: M[]; picked: Record<string, string>; busy: boolean };
type Updater<T> = T | ((prev: T) => T);

const MAX_MESSAGES = 80;
const keyFor = (userId: string) => `ss-studio-history:${userId}`;

let userId: string | null = null;
let state: State<any> = { messages: [], picked: {}, busy: false };
const listeners = new Set<() => void>();

function emit() {
  if (userId) {
    try {
      localStorage.setItem(
        keyFor(userId),
        JSON.stringify({ messages: state.messages.slice(-MAX_MESSAGES), picked: state.picked }),
      );
    } catch {
      /* storage full or unavailable */
    }
  }
  listeners.forEach((l) => l());
}

function apply<T>(prev: T, next: Updater<T>): T {
  return typeof next === "function" ? (next as (p: T) => T)(prev) : next;
}

/**
 * Loads the saved Studio conversation for this user. Survives route changes (module state)
 * and reloads (localStorage). Progress bubbles are dropped on reload because the requests behind them died.
 */
export function loadStudioHistory<M extends { kind: string }>(uid: string, initial: () => M[]) {
  if (userId === uid) return;
  userId = uid;
  let saved: { messages?: M[]; picked?: Record<string, string> } | null = null;
  try {
    saved = JSON.parse(localStorage.getItem(keyFor(uid)) ?? "null");
  } catch {
    saved = null;
  }
  const messages = (saved?.messages ?? []).filter((m) => m.kind !== "progress");
  state = { messages: messages.length ? messages : initial(), picked: saved?.picked ?? {}, busy: false };
  emit();
}

export function resetStudioHistory<M>(initial: M[]) {
  state = { messages: initial, picked: {}, busy: false };
  emit();
}

export function useStudioHistory<M>() {
  const snap = useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    () => state,
    () => state,
  ) as State<M>;
  return {
    ready: userId !== null,
    messages: snap.messages,
    picked: snap.picked,
    busy: snap.busy,
    setMessages: (next: Updater<M[]>) => {
      state = { ...state, messages: apply(state.messages, next) };
      emit();
    },
    setPicked: (next: Updater<Record<string, string>>) => {
      state = { ...state, picked: apply(state.picked, next) };
      emit();
    },
    setBusy: (busy: boolean) => {
      state = { ...state, busy };
      listeners.forEach((l) => l());
    },
  };
}
