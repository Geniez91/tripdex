<script setup lang="ts">
const auth = useAuth();
</script>

<template>
  <NuxtRouteAnnouncer />
  <TripdexAppShell :authenticated="auth.status.value === 'authenticated'">
    <NuxtPage :key="auth.sessionVersion.value" />
  </TripdexAppShell>
</template>
