<script setup lang="ts">
const auth = useAuth();
const route = useRoute();
const failed = ref(false);

await auth.initialize();
if (
  auth.status.value === "error" &&
  auth.errorCode.value === "USERNAME_TAKEN"
) {
  await navigateTo("/auth/username");
} else if (auth.status.value !== "authenticated") failed.value = true;
else await navigateTo(safeRedirect(route.query.redirect));

function safeRedirect(value: unknown): string {
  if (
    typeof value !== "string" ||
    !value.startsWith("/") ||
    value.startsWith("//")
  )
    return "/journal";
  return value;
}
</script>

<template>
  <main class="auth-page">
    <h1 v-if="!failed">Connexion en cours…</h1>
    <template v-else>
      <h1>Confirmation impossible</h1>
      <p class="feedback error" role="alert">
        Le lien ne permet pas d'établir la session. Réessayez depuis la page de
        connexion.
      </p>
      <NuxtLink to="/login">Retour au login</NuxtLink>
    </template>
  </main>
</template>
