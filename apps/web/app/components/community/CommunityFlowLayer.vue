<script setup lang="ts">
import type { CommunityFlow } from "~/types/interfaces/community-map";
const props = defineProps<{
  flows: CommunityFlow[];
  anchors: Map<string, [number, number]>;
  drawRoute: (origin: string, destination: string) => string;
}>();
const maximum = computed<number>(() =>
  Math.max(1, ...props.flows.map((flow) => flow.travelers)),
);
</script>
<template>
  <g class="community-flows" aria-hidden="true" pointer-events="none">
    <g
      v-for="flow in flows"
      :key="`${flow.originIso3}-${flow.destinationIso3}`"
      class="community-flow"
      :data-origin="flow.originIso3"
      :data-destination="flow.destinationIso3"
    >
      <path
        v-if="flow.originIso3 !== flow.destinationIso3"
        :d="drawRoute(flow.originIso3, flow.destinationIso3)"
        fill="none"
        :stroke-width="1 + 3 * Math.sqrt(flow.travelers / maximum)"
        :stroke-opacity="0.45 + (0.45 * flow.travelers) / maximum"
      />
      <circle
        v-if="anchors.get(flow.originIso3)"
        :cx="anchors.get(flow.originIso3)?.[0]"
        :cy="anchors.get(flow.originIso3)?.[1]"
        r="3"
        class="flow-origin"
      />
      <circle
        v-if="anchors.get(flow.destinationIso3)"
        :cx="anchors.get(flow.destinationIso3)?.[0]"
        :cy="anchors.get(flow.destinationIso3)?.[1]"
        r="6"
        class="flow-destination"
      />
    </g>
  </g>
</template>
<style scoped>
path {
  stroke: rgb(var(--v-theme-primary));
}
.flow-origin {
  fill: rgb(var(--v-theme-surface));
  stroke: rgb(var(--v-theme-primary));
  stroke-width: 1.5;
}
.flow-destination {
  fill: rgb(var(--v-theme-sun));
  stroke: rgb(var(--v-theme-ink));
  stroke-width: 1.5;
}
@media (max-width: 600px) {
  .community-flow:nth-child(n + 4) {
    display: none;
  }
}
</style>
