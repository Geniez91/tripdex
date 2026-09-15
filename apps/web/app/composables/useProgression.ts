import type { PersonalProgression } from "~/types/interfaces/progression";
import { getPersonalProgression } from "~/services/api/progression";

interface ProgressionState {
  userId: string | null;
  data: PersonalProgression | null;
  hasLoaded: boolean;
  loading: boolean;
  error: string | null;
  invalidated: boolean;
}

interface RequestCoordination {
  version: number;
  pending: Promise<void> | null;
}

function emptyProgression(userId: string | null): ProgressionState {
  return {
    userId,
    data: null,
    hasLoaded: false,
    loading: false,
    error: null,
    invalidated: userId !== null,
  };
}

const requests = new WeakMap<ProgressionState, RequestCoordination>();

export function useProgression() {
  const state = useState<ProgressionState>("private-progression-cache", () =>
    emptyProgression(null),
  );
  const { scope } = usePrivateSession();
  const api = useTripdexApi();

  function coordination(snapshot: ProgressionState): RequestCoordination {
    let request = requests.get(snapshot);
    if (!request) {
      request = { version: 0, pending: null };
      requests.set(snapshot, request);
    }
    return request;
  }

  function currentState(): ProgressionState {
    const userId = scope.value.userId;
    if (state.value.userId !== userId) {
      coordination(state.value).version++;
      state.value = emptyProgression(userId);
    }
    return state.value;
  }

  watch(
    () => scope.value.userId,
    () => currentState(),
  );

  function invalidate(): void {
    const snapshot = currentState();
    coordination(snapshot).version++;
    snapshot.invalidated = true;
  }

  async function load(): Promise<PersonalProgression | null> {
    const snapshot = currentState();
    if (!snapshot.userId) return null;
    if (snapshot.hasLoaded && !snapshot.invalidated) return snapshot.data;

    const request = coordination(snapshot);
    if (request.pending) await request.pending;
    else {
      const version = request.version;
      snapshot.loading = true;
      snapshot.error = null;
      request.pending = (async () => {
        try {
          const progression = await getPersonalProgression(api);
          if (state.value !== snapshot || version !== request.version) return;
          snapshot.data = progression;
          snapshot.hasLoaded = true;
          snapshot.invalidated = false;
        } catch {
          if (state.value === snapshot && version === request.version) {
            snapshot.error = "Impossible de charger ta progression.";
          }
        } finally {
          if (state.value === snapshot) snapshot.loading = false;
        }
      })();
      try {
        await request.pending;
      } finally {
        request.pending = null;
      }
    }

    if (state.value !== snapshot) return null;
    if (snapshot.invalidated && !snapshot.error) return load();
    return snapshot.data;
  }

  async function retry(): Promise<PersonalProgression | null> {
    const snapshot = currentState();
    snapshot.error = null;
    snapshot.invalidated = true;
    return load();
  }

  return {
    data: computed(() => currentState().data),
    hasLoaded: computed(() => currentState().hasLoaded),
    loading: computed(() => currentState().loading),
    error: computed(() => currentState().error),
    invalidated: computed(() => currentState().invalidated),
    load,
    retry,
    invalidate,
  };
}
