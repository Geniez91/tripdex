<script setup lang="ts">
import type { CommunityCountryExplorer } from '~/types/interfaces/community-country-explorer';
import type { Country } from '~/types/tripdex';
import CommunityCountryPanelContent from './CommunityCountryPanelContent.vue';

defineProps<{
  open: boolean;
  country: Pick<Country, 'iso2' | 'name'> | null;
  detail: CommunityCountryExplorer | null;
  loading: boolean;
  failed: boolean;
}>();
const emit = defineEmits<{ close: [] }>();
const display = useDisplay();
</script>

<template>
  <VBottomSheet
    v-if="display.smAndDown.value"
    :model-value="open"
    inset
    scrollable
    content-class="country-panel-bottom-sheet"
    @update:model-value="(value: boolean) => !value && emit('close')"
  >
    <VCard class="country-panel-surface" role="region" aria-label="Country Explorer">
      <CommunityCountryPanelContent :country="country" :detail="detail" :loading="loading" :failed="failed" @close="emit('close')" />
    </VCard>
  </VBottomSheet>
  <VCard
    v-else-if="open"
    class="country-panel-surface country-panel-desktop"
    role="region"
    aria-label="Country Explorer"
    elevation="3"
  >
    <div class="panel-scroll">
      <CommunityCountryPanelContent :country="country" :detail="detail" :loading="loading" :failed="failed" @close="emit('close')" />
    </div>
  </VCard>
</template>

<style scoped>
.country-panel-surface { min-width: 0; border: 1px solid #27677c40; border-radius: 15px; background: #FFFEFA; }
.country-panel-desktop { height: min(72vh, 760px); overflow: hidden; }
.panel-scroll { height: 100%; overflow-y: auto; overscroll-behavior: contain; }
@media (max-width: 960px) {
  .country-panel-desktop { height: min(62vh, 620px); border-radius: 15px 15px 0 0; }
}
</style>
