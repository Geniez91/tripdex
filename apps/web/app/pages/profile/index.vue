<script setup lang="ts">
import type { Country } from "~/types/tripdex";
import PassportBook from "~/components/passport/PassportBook.vue";
import { getVisitedCountries } from "~/services/api/profile";

const auth = useAuth();
const api = useTripdexApi();
await auth.initialize();
const { data, status, error, refresh } = await useAsyncData<Country[]>(
  "private-passport-countries",
  () =>
    auth.status.value === "authenticated"
      ? getVisitedCountries(api)
      : Promise.resolve([]),
  { server: false, default: () => [] },
);

async function logout() {
  try {
    await auth.logout();
    await navigateTo("/");
  } catch {
    // useAuth keeps the failure message across the private page reset.
  }
}
</script>

<template>
  <main class="passport-page">
    <header class="passport-heading">
      <div>
        <span class="eyebrow">LES VOYAGES QUI TE RESSEMBLENT</span>
        <h1>Mon passeport</h1>
      </div>
      <NuxtLink to="/profile/map"
        >Voir ma carte <VIcon icon="mdi-arrow-top-right" size="16"
      /></NuxtLink>
    </header>
    <p v-if="auth.error.value" class="feedback error" role="alert">
      Déconnexion ou session indisponible. Réessayez.
    </p>
    <ClientOnly>
      <PassportBook
        :profile="auth.profile.value"
        :countries="data ?? []"
        :loading="status === 'pending' || status === 'idle'"
        :failed="!!error"
        @retry="refresh()"
        @logout="logout"
      />
      <template #fallback
        ><p class="feedback" role="status">
          Ouverture de ton passeport…
        </p></template
      >
    </ClientOnly>
  </main>
</template>

<style scoped>
.passport-page {
  padding: 48px 0 40px;
}
.passport-heading {
  display: flex;
  align-items: end;
  justify-content: space-between;
  gap: 20px;
  margin-bottom: 30px;
}
.passport-heading h1 {
  margin-top: 8px;
  font-size: clamp(32px, 4vw, 46px);
  letter-spacing: -1.5px;
}
.passport-heading a {
  font-size: 13px;
  text-underline-offset: 5px;
}
@media (max-width: 600px) {
  .passport-page {
    padding-top: 28px;
  }
  .passport-heading {
    align-items: start;
    flex-direction: column;
    gap: 12px;
  }
}
</style>
