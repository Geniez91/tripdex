<script setup lang="ts">
import type { CountryMemory } from "~/types/interfaces/photo-contests";
const props = defineProps<{
  memory: CountryMemory;
  anchor: [number, number];
  zoom?: number;
  camera?: string;
  active?: boolean;
}>();
const emit = defineEmits<{ 'update:active': [value: boolean] }>();
const button = ref<HTMLButtonElement | null>(null);
const container = ref<HTMLElement | undefined>();
const detailId = useId();
let closeTimer: ReturnType<typeof setTimeout> | undefined;
function cancelClose(): void { clearTimeout(closeTimer); }
function open(): void { cancelClose(); emit('update:active', true); }
function close(): void { cancelClose(); emit('update:active', false); }
function leave(): void { cancelClose(); closeTimer = setTimeout(close, 180); }
function hover(event: PointerEvent): void {
  if (event.pointerType === 'mouse') open();
}
onMounted(() => { container.value = button.value?.closest<HTMLElement>('.world-map') ?? undefined; });
onBeforeUnmount(cancelClose);
watch([() => props.camera, () => props.zoom, () => props.anchor[0], () => props.anchor[1]], () => {
  if (props.active) close();
});
</script>
<template>
  <g v-if="memory.winnerSubmissionId && memory.imageUrl" class="memory-marker"
    :transform="`translate(${anchor[0]}, ${anchor[1]})`">
    <!-- Cancel only camera scale: the outer translation remains geographic. -->
    <g :transform="`scale(${1 / Math.max(1, zoom ?? 1)})`">
      <line x1="0" y1="-10" x2="0" y2="0" stroke="#E8BA59" stroke-width="1.25" vector-effect="non-scaling-stroke" />
      <circle r="2" fill="#E8BA59" stroke="#182C40" stroke-width=".5" />
      <foreignObject x="-28" y="-54" width="56" height="44" class="memory-photo-surface">
        <div xmlns="http://www.w3.org/1999/xhtml">
          <button ref="button" type="button" class="memory-photo"
            :aria-label="`${memory.countryName} — Souvenir de la semaine — par @${memory.user.username}`"
            :aria-expanded="active ?? false" :aria-controls="active ? detailId : undefined"
            @pointerdown.stop @click.stop="open" @keydown.stop @keydown.esc="close"
            @pointerenter="hover" @pointerleave="leave" @focus="open" @blur="leave">
            <img :src="memory.imageUrl" alt="" draggable="false" />
          </button>
          <v-overlay class="memory-overlay" :model-value="active ?? false" :activator="button ?? undefined"
            :attach="container" contained :scrim="false" :open-on-click="false"
            :open-on-hover="false" :open-on-focus="false" :capture-focus="false"
            location-strategy="connected" location="top center" origin="auto" :offset="8"
            scroll-strategy="close" :max-width="260" :viewport-margin="8"
            @update:model-value="$emit('update:active', $event)">
            <article :id="detailId" class="memory-detail" :aria-label="`Souvenir — ${memory.countryName}`"
              @pointerenter="cancelClose" @pointerleave="leave" @focusin="cancelClose" @focusout="leave"
              @pointerdown.stop @click.stop @keydown.esc="close">
              <img :src="memory.imageUrl" :alt="`Souvenir de ${memory.countryName}`" />
              <div class="memory-detail-copy">
                <strong>{{ memory.countryName }}</strong>
                <p>Souvenir de la semaine</p>
                <p class="memory-author">par @{{ memory.user.username }}</p>
              </div>
            </article>
          </v-overlay>
        </div>
      </foreignObject>
    </g>
  </g>
</template>
<style scoped>
.memory-photo-surface { overflow: visible; }
/* Give Vuetify's connected positioning a map-sized scroll boundary. */
.memory-overlay { overflow: scroll; scrollbar-width: none; }
.memory-overlay::-webkit-scrollbar { display: none; }
.memory-photo { display: block; width: 56px; height: 44px; padding: 2px; border: 2px solid #E8BA59; border-radius: 7px; background: #FFFEFA; box-shadow: 0 2px 5px #182c4035; cursor: pointer; }
.memory-photo img { display: block; width: 100%; height: 100%; object-fit: cover; border-radius: 3px; pointer-events: none; }
.memory-photo:focus-visible { outline: 2px solid #182C40; outline-offset: 3px; }
.memory-detail { width: 240px; max-width: min(260px, calc(100vw - 32px)); overflow: hidden; border: 1px solid #E8BA59; border-radius: 12px; background: #FFFEFA; color: #182C40; box-shadow: 0 6px 20px #182c4030; }
.memory-detail > img { display: block; width: 100%; height: 120px; object-fit: cover; }
.memory-detail-copy { padding: 10px 12px; overflow-wrap: anywhere; }
.memory-detail strong { font: 600 16px/1.3 Georgia, serif; }
.memory-detail p { margin: 4px 0 0; font-size: 12px; line-height: 1.4; }
.memory-author { color: #526574; }
</style>
