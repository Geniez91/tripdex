import { createClient, type SupabaseClient } from "@supabase/supabase-js";

export default defineNuxtPlugin({
  name: "supabase",
  setup() {
    const config = useRuntimeConfig();
    const supabase: SupabaseClient | null =
      config.public.supabaseUrl && config.public.supabasePublishableKey
        ? createClient(
            config.public.supabaseUrl,
            config.public.supabasePublishableKey,
            {
              auth: {
                persistSession: true,
                autoRefreshToken: true,
                detectSessionInUrl: true,
                flowType: "pkce",
              },
            },
          )
        : null;

    return { provide: { supabase } };
  },
});

declare module "#app" {
  interface NuxtApp {
    $supabase: SupabaseClient | null;
  }
}

declare module "vue" {
  interface ComponentCustomProperties {
    $supabase: SupabaseClient | null;
  }
}
