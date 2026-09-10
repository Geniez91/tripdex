<script setup lang="ts">
import { AuthActionError } from "~/types/auth";
import { registerMessage } from "~/services/authMessages";
import { safeRedirect } from "~/services/navigation";

const auth = useAuth();
const route = useRoute();
const email = ref("");
const username = ref("");
const password = ref("");
const passwordConfirmation = ref("");
const error = ref("");
const confirmationPending = ref(false);
const submitting = ref(false);

async function submit() {
  error.value = "";
  if (password.value !== passwordConfirmation.value) {
    error.value = "Les mots de passe ne correspondent pas.";
    return;
  }
  submitting.value = true;
  try {
    const hasSession = await auth.register(
      email.value,
      username.value,
      password.value,
    );
    if (!hasSession) {
      confirmationPending.value = true;
      return;
    }
    if (
      auth.status.value === "error" &&
      auth.errorCode.value === "USERNAME_TAKEN"
    ) {
      await navigateTo("/auth/username");
    } else {
      await navigateTo(safeRedirect(route.query.redirect));
    }
  } catch (cause: unknown) {
    if (cause instanceof AuthActionError && cause.code === "USERNAME_TAKEN") {
      await navigateTo("/auth/username");
    } else {
      error.value = registerMessage(cause);
    }
  } finally {
    submitting.value = false;
  }
}
</script>

<template>
  <main class="auth-page">
    <h1>Créer un compte</h1>
    <p v-if="confirmationPending" class="feedback" role="status">
      Votre compte est créé. Confirmez votre adresse email, puis revenez vous
      connecter.
    </p>
    <form v-else @submit.prevent="submit">
      <label
        >Email<input v-model="email" type="email" required autocomplete="email"
      /></label>
      <label
        >Username<input
          v-model="username"
          required
          minlength="3"
          maxlength="30"
          autocomplete="username"
      /></label>
      <label
        >Mot de passe<input
          v-model="password"
          type="password"
          required
          minlength="8"
          autocomplete="new-password"
      /></label>
      <label
        >Confirmation<input
          v-model="passwordConfirmation"
          type="password"
          required
          autocomplete="new-password"
      /></label>
      <p v-if="error" class="feedback error" role="alert">{{ error }}</p>
      <button class="primary-button" type="submit" :disabled="submitting">
        Créer mon compte
      </button>
    </form>
    <NuxtLink to="/login">J'ai déjà un compte</NuxtLink>
  </main>
</template>
