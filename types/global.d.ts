export {};

declare global {
  interface DiscordSessionUser {
    id: string;
    username: string;
    nickname?: string;
    global_name?: string;
    name?: string;
    avatar: string | null;
    roles?: string[];
  }
}
