// Global type used across the app (never imported). It was missing from the project, which broke `tsc` / `next build`.
interface DiscordSessionUser {
  id: string;
  username: string;
  global_name?: string;
  nickname?: string;
  name?: string;
  avatar?: string | null;
  /** unix seconds, added by signSession() */
  exp?: number;
}
