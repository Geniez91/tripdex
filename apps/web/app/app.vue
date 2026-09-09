<template>
  <div class="site-shell">
    <NuxtRouteAnnouncer />
    <header class="site-header">
      <NuxtLink to="/" class="wordmark" aria-label="TripDex, accueil">
        <span class="brand-icon" aria-hidden="true">↗</span>Trip<span>Dex</span
        ><span class="brand-dot">.</span>
      </NuxtLink>
      <nav class="main-nav" aria-label="Navigation principale">
        <NuxtLink to="/">Carte</NuxtLink>
        <NuxtLink v-if="auth.status.value === 'authenticated'" to="/journal"
          >Journal</NuxtLink
        >
        <NuxtLink v-if="auth.status.value === 'authenticated'" to="/profile"
          >Profil</NuxtLink
        >
        <NuxtLink v-if="auth.status.value !== 'authenticated'" to="/login"
          >Connexion</NuxtLink
        >
        <NuxtLink v-if="auth.status.value !== 'authenticated'" to="/register"
          >Inscription</NuxtLink
        >
      </nav>
    </header>
    <NuxtPage :key="auth.sessionVersion.value" />
    <footer class="site-footer">
      <span>TripDex · Un voyage à la fois.</span>
      <span
        >Carte :
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
        ></span
      >
    </footer>
  </div>
</template>
<script setup lang="ts">
const auth = useAuth();
</script>
