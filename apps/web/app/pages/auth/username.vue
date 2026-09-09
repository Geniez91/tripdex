<script setup lang="ts">
import { AuthActionError } from "~/types/auth";

const auth = useAuth();
const username = ref("");
const error = ref("");
const submitting = ref(false);

await auth.initialize();
if (auth.status.value === "anonymous") await navigateTo("/login");

async function submit() {
  submitting.value = true;
  error.value = "";
  try {
    await auth.completeProvisioning(username.value);
    await navigateTo("/journal");
  } catch (cause: unknown) {
    error.value =
      cause instanceof AuthActionError && cause.code === "USERNAME_TAKEN"
        ? "Ce username est déjà utilisé. Choisissez-en un autre."
        : "Le provisioning est temporairement indisponible. Réessayez.";
  } finally {
    submitting.value = false;
  }
}
</script>

<template>
  <main class="auth-page">
    <h1>Choisissez votre username</h1>
    <p>
      Votre compte Auth est confirmé, mais votre profil TripDex doit encore être
      créé.
    </p>
    <form @submit.prevent="submit">
      <label
        >Username<input
          v-model="username"
          required
          minlength="3"
          maxlength="30"
          autocomplete="username"
      /></label>
      <p v-if="error" class="feedback error" role="alert">{{ error }}</p>
      <button class="primary-button" type="submit" :disabled="submitting">
        Continuer
      </button>
    </form>
  </main>
</template>
