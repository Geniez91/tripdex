<script setup lang="ts">
import {
  activeNavigation,
  navigationItems,
  type NavigationId,
} from "~/utils/navigation";

const route = useRoute();
const active = computed<NavigationId | null>(() =>
  activeNavigation(route.path),
);
</script>

<template>
  <nav class="app-navigation" aria-label="Navigation principale">
    <NuxtLink
      v-for="item in navigationItems"
      :key="item.id"
      :to="item.to"
      :prefetch="false"
      class="navigation-link"
      :class="{ 'is-active': active === item.id }"
      :aria-current="active === item.id ? 'page' : undefined"
    >
      <VIcon :icon="item.icon" size="22" aria-hidden="true" />
      <span>{{ item.label }}</span>
    </NuxtLink>
    <VTooltip text="Logger un voyage" location="bottom" :open-on-focus="true">
      <template #activator="{ props: tooltipProps }">
        <NuxtLink
          v-bind="tooltipProps"
          to="/#trip-form-title"
          :prefetch="false"
          class="navigation-action"
          active-class=""
          exact-active-class=""
          aria-current-value="false"
          aria-label="Logger un voyage"
        >
          <VIcon icon="mdi-plus" size="24" aria-hidden="true" />
        </NuxtLink>
      </template>
    </VTooltip>
  </nav>
</template>

<style scoped>
.app-navigation {
  display: flex;
  align-self: stretch;
  gap: 24px;
}
.navigation-link {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  min-height: 64px;
  padding: 0 4px;
  color: rgb(var(--v-theme-muted));
  text-decoration: none;
  font-size: 14px;
  font-weight: 500;
  transition: color 160ms ease;
}
.navigation-action {
  display: flex;
  align-items: center;
  justify-content: center;
  align-self: center;
  justify-self: center;
  flex: 0 0 44px;
  width: 44px;
  height: 44px;
  border: 1px solid rgb(var(--v-theme-outline));
  border-radius: 10px;
  background: rgb(var(--v-theme-surface));
  color: rgb(var(--v-theme-primary));
  text-decoration: none;
}
.navigation-action:hover {
  background: rgb(var(--v-theme-ocean));
  border-color: rgb(var(--v-theme-primary));
}
.navigation-action:focus-visible {
  outline: 2px solid rgb(var(--v-theme-primary));
  outline-offset: 3px;
}
.navigation-link::after {
  content: "";
  position: absolute;
  inset: auto 4px 0;
  height: 3px;
  border-radius: 3px 3px 0 0;
  background: rgb(var(--v-theme-ink));
  transform: scaleX(0);
  transition: transform 160ms ease;
}
.navigation-link:hover {
  color: rgb(var(--v-theme-primary));
}
.navigation-link:hover::after {
  transform: scaleX(0.35);
  opacity: 0.35;
}
.navigation-link.is-active {
  color: rgb(var(--v-theme-ink));
  font-weight: 650;
}
.navigation-link:focus-visible {
  outline: 2px solid rgb(var(--v-theme-primary));
  outline-offset: -5px;
  border-radius: 8px;
}
.navigation-link.is-active::after {
  transform: scaleX(1);
  opacity: 1;
}
@media (max-width: 959px) {
  .app-navigation {
    position: fixed;
    z-index: 100;
    inset: auto 0 0;
    display: grid;
    grid-template-columns: repeat(4, minmax(0, 1fr)) 52px;
    gap: 0;
    padding: 0 8px env(safe-area-inset-bottom, 0px);
    background: rgb(var(--v-theme-surface));
    border-top: 1px solid rgb(var(--v-theme-outline));
    box-shadow: 0 -4px 18px rgba(var(--v-theme-ink), 0.04);
  }
  .navigation-link {
    flex-direction: column;
    gap: 4px;
    padding: 8px 2px;
    font-size: 12px;
  }
  .navigation-link::after {
    left: 24%;
    right: 24%;
  }
}
@media (prefers-reduced-motion: reduce) {
  .navigation-link,
  .navigation-link::after {
    transition: none;
  }
}
</style>
