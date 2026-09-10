<script setup lang="ts">
defineProps<{ authenticated: boolean }>();
</script>

<template>
  <VApp class="tripdex-app">
    <div class="site-shell">
      <a class="skip-link" href="#page-content">Aller au contenu</a>
      <header class="site-header">
        <NuxtLink to="/" class="wordmark" aria-label="TripDex, accueil">
          <VIcon
            class="brand-icon"
            icon="mdi-compass-outline"
            size="24"
            aria-hidden="true"
          />
          Trip<span>Dex</span><span class="brand-dot">.</span>
        </NuxtLink>
        <TripdexAppNavigation />
        <ClientOnly
          ><div v-if="!authenticated" class="account-actions">
            <VBtn to="/login" variant="text" size="small">Connexion</VBtn>
            <VBtn to="/register" color="primary" variant="outlined" size="small"
              >Inscription</VBtn
            >
          </div></ClientOnly
        >
      </header>
      <div id="page-content" tabindex="-1" class="page-content">
        <slot />
      </div>
      <footer class="site-footer">
        <span>TripDex · Un voyage à la fois.</span>
        <span>
          Carte :
          <a
            href="https://www.naturalearthdata.com/"
            target="_blank"
            rel="noreferrer"
            >Natural Earth</a
          >
          · Pays :
          <a
            href="https://github.com/mledoze/countries"
            target="_blank"
            rel="noreferrer"
            >mledoze / ODbL</a
          >
        </span>
      </footer>
    </div>
  </VApp>
</template>

<style scoped>
.site-shell:has(.passport-page) {
  width: 100%;
  max-width: 1480px;
}
.site-shell:has(.trip-detail) {
  width: 100%;
  max-width: 2048px;
  padding-inline: clamp(32px, 4vw, 64px);
}
@media (max-width: 959px) {
  .site-shell:has(.trip-detail) {
    padding-inline: 24px;
  }
}
@media (max-width: 600px) {
  .site-shell:has(.trip-detail) {
    padding-inline: 16px;
  }
}
.site-header {
  gap: 24px;
}
.account-actions {
  display: flex;
  gap: 4px;
}
.page-content {
  flex: 1;
  min-width: 0;
}
.skip-link {
  position: absolute;
  top: 8px;
  left: 16px;
  z-index: 200;
  padding: 12px;
  background: rgb(var(--v-theme-surface));
  transform: translateY(-160%);
}
.skip-link:focus {
  transform: translateY(0);
}
@media (max-width: 959px) {
  .site-header {
    gap: 8px;
  }
}
@media (max-width: 380px) {
  .site-header {
    flex-wrap: wrap;
    padding: 12px 0;
  }
}
</style>
