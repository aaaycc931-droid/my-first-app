/**
 * The private-test APK is deliberately local-only. This build-time replacement
 * prevents the shared practice panels from creating a Supabase client even if
 * cloud configuration is present in the shell that runs the build.
 */
export function getSupabaseBrowserClient(): null {
  return null;
}
