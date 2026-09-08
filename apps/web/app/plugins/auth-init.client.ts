export default defineNuxtPlugin({
  name: "auth-init",
  dependsOn: ["supabase"],
  async setup() {
    await useAuth().initialize();
  },
});
