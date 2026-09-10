import { AuthActionError } from "~/types/auth";

export function registerMessage(cause: unknown): string {
  if (cause instanceof AuthActionError) {
    if (cause.code === "USERNAME_INVALID")
      return "Choisissez un username de 3 à 30 caractères (lettres, chiffres ou _).";
    if (cause.code === "AUTH_UNAVAILABLE")
      return "Inscription temporairement indisponible. Réessayez.";
    if (cause.code === "USERNAME_TAKEN")
      return "Ce username est déjà utilisé. Choisissez-en un autre.";
  }
  return "Impossible de créer le compte. Réessayez.";
}
