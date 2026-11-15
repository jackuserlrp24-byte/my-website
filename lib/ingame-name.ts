// Turns a Discord server member into the one line of text that is shown as their in-game name.

interface MemberNames {
  nick?: string | null;
  user?: { username?: string; global_name?: string | null };
}

const MAX_LENGTH = 50;

/**
 * This text is handed to other FiveM scripts (chat, overhead names, HUDs), so anything those scripts
 * could treat as formatting is removed: ^ colour codes (chat), ~ codes (GTA text), < > (HTML-based UIs),
 * plus control characters and invisible / text-direction characters.
 */
export function cleanName(raw: unknown): string {
  const text = String(raw ?? '')
    .replace(/\s+/g, ' ')
    // eslint-disable-next-line no-control-regex
    .replace(/[\u0000-\u001f\u007f\u200b-\u200f\u202a-\u202e\u2066-\u2069\ufeff]/g, '')
    .replace(/[\^~<>]/g, '')
    .trim();
  // Cut by character, not by UTF-16 unit, so an emoji is never split in half.
  return Array.from(text).slice(0, MAX_LENGTH).join('').trim();
}

/** Server nickname first (the whitelist form sets it to "[collar] RP Name"), then Discord display name, then username. */
export function pickDisplayName(member: MemberNames): string | null {
  for (const candidate of [member.nick, member.user?.global_name, member.user?.username]) {
    const name = cleanName(candidate);
    if (name) return name;
  }
  return null;
}
