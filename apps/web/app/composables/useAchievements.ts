import type { PersonalAchievementsResponse } from "~/types/interfaces/achievements";
import { getPersonalAchievements } from "~/services/api/achievements";

interface AchievementsState {
  userId: string | null;
  data: PersonalAchievementsResponse | null;
  hasLoaded: boolean;
  loading: boolean;
  error: string | null;
  invalidated: boolean;
}

interface RequestCoordination {
  version: number;
  pending: Promise<void> | null;
}

function emptyAchievements(userId: string | null): AchievementsState {
  return {
    userId,
    data: null,
    hasLoaded: false,
    loading: false,
    error: null,
    invalidated: userId !== null,
  };
}

const requests = new WeakMap<AchievementsState, RequestCoordination>();

export function useAchievements() {
  const state = useState<AchievementsState>("private-achievements-cache", () =>
    emptyAchievements(null),
  );
  const { scope } = usePrivateSession();
  const api = useTripdexApi();

  function coordination(snapshot: AchievementsState): RequestCoordination {
    let request = requests.get(snapshot);
    if (!request) {
      request = { version: 0, pending: null };
      requests.set(snapshot, request);
    }
    return request;
  }

  function currentState(): AchievementsState {
    const userId = scope.value.userId;
    if (state.value.userId !== userId) {
      coordination(state.value).version++;
      state.value = emptyAchievements(userId);
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

  async function load(): Promise<PersonalAchievementsResponse | null> {
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
          const achievements = await getPersonalAchievements(api);
          if (state.value !== snapshot || version !== request.version) return;
          snapshot.data = achievements;
          snapshot.hasLoaded = true;
          snapshot.invalidated = false;
        } catch {
          if (state.value === snapshot && version === request.version) {
            snapshot.error = "Impossible de charger tes badges.";
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

  async function retry(): Promise<PersonalAchievementsResponse | null> {
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
