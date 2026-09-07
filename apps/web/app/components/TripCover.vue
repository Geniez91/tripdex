<script setup lang="ts">
const props = defineProps<{ url?: string | null; title: string }>();
const failed = ref(false);
watch(
  () => props.url,
  () => {
    failed.value = false;
  },
);
</script>

<template>
  <img
    v-if="url && !failed"
    :src="url"
    :alt="`Cover de ${title}`"
    @error="failed = true"
  />
</template>
