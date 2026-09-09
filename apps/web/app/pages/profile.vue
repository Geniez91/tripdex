<script setup lang="ts">
const auth = useAuth();
await auth.initialize();

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
  <main class="auth-page">
    <h1>Mon profil</h1>
    <p v-if="auth.error.value" class="feedback error" role="alert">
      Déconnexion ou session indisponible. Réessayez.
    </p>
    <p><strong>Username :</strong> {{ auth.profile.value?.username }}</p>
    <p><strong>Email :</strong> {{ auth.profile.value?.email }}</p>
    <button class="primary-button" type="button" @click="logout">
      Se déconnecter
    </button>
  </main>
</template>
