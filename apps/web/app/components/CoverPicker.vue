<script setup lang="ts">
const file = defineModel<File | null>({ default: null });
const props = defineProps<{ disabled?: boolean; id: string }>();
const preview = ref("");
const error = ref("");
const input = ref<HTMLInputElement | null>(null);
watch(file, (value) => {
  if (preview.value) URL.revokeObjectURL(preview.value);
  preview.value = value ? URL.createObjectURL(value) : "";
  if (!value && input.value) input.value.value = "";
});
onBeforeUnmount(() => {
  if (preview.value) URL.revokeObjectURL(preview.value);
});
function select(event: Event) {
  const target = event.target as HTMLInputElement;
  const selected = target.files?.[0] ?? null;
  error.value = "";
  if (
    selected &&
    (!["image/jpeg", "image/png", "image/webp"].includes(selected.type) ||
      selected.size > 5 * 1024 * 1024 ||
      !selected.size)
  ) {
    error.value = "Choisissez une image JPEG, PNG ou WebP de 5 Mio maximum.";
    target.value = "";
    file.value = null;
    return;
  }
  file.value = selected;
}
</script>

<template>
  <div class="field">
    <label :for="props.id"
      >Photo de couverture <span class="optional">facultatif</span></label
    >
    <input
      :id="props.id"
      ref="input"
      type="file"
      accept="image/jpeg,image/png,image/webp"
      :disabled="disabled"
      :aria-describedby="`${props.id}-help`"
      @change="select"
    />
    <small :id="`${props.id}-help`">JPEG, PNG ou WebP · 5 Mio maximum</small>
    <img
      v-if="preview"
      :src="preview"
      class="cover-preview"
      alt="Aperçu de la cover sélectionnée"
    />
    <button
      v-if="file"
      type="button"
      class="text-button"
      :disabled="disabled"
      @click="file = null"
    >
      Retirer la sélection
    </button>
    <p v-if="error" role="alert" class="feedback error">{{ error }}</p>
  </div>
</template>

<style scoped>
.cover-preview {
  width: 100%;
  max-height: 240px;
  object-fit: contain;
  border-radius: 8px;
}
</style>
