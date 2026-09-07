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
        <NuxtLink to="/journal">Journal</NuxtLink>
      </nav>
    </header>
    <NuxtPage />
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
