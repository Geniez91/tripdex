<script setup lang="ts">
import { AuthActionError } from "~/types/auth";

const auth = useAuth();
const route = useRoute();
const email = ref("");
const password = ref("");
const error = ref("");
const submitting = ref(false);

async function submit() {
  submitting.value = true;
  error.value = "";
  try {
    await auth.login(email.value, password.value);
    if (
      auth.status.value === "error" &&
      auth.errorCode.value === "USERNAME_TAKEN"
    ) {
      await navigateTo("/auth/username");
    } else {
      await navigateTo(safeRedirect(route.query.redirect));
    }
  } catch (cause: unknown) {
    if (
      cause instanceof AuthActionError &&
      cause.code === "EMAIL_CONFIRMATION_REQUIRED"
    ) {
      error.value = "Confirmez votre adresse email avant de vous connecter.";
    } else if (
      cause instanceof AuthActionError &&
      cause.code === "USERNAME_TAKEN"
    ) {
      await navigateTo("/auth/username");
    } else if (
      cause instanceof AuthActionError &&
      cause.code === "AUTH_UNAVAILABLE"
    ) {
      error.value = "Le service est temporairement indisponible. Réessayez.";
    } else {
      error.value = "Email ou mot de passe incorrect.";
    }
  } finally {
    submitting.value = false;
  }
}

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
    <h1>Se connecter</h1>
    <form @submit.prevent="submit">
      <label
        >Email<input v-model="email" type="email" required autocomplete="email"
      /></label>
      <label
        >Mot de passe<input
          v-model="password"
          type="password"
          required
          autocomplete="current-password"
      /></label>
      <p v-if="error" class="feedback error" role="alert">{{ error }}</p>
      <button class="primary-button" type="submit" :disabled="submitting">
        Se connecter
      </button>
    </form>
    <NuxtLink to="/register">Créer un compte</NuxtLink>
  </main>
</template>
