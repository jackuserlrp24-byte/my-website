const API = 'https://discord.com/api/v10';

// Channel IDs. Set these in your env to post somewhere other than the patrols channel.
const FALLBACK_CHANNEL = '1532786346920247398';
export const TRAININGS_CHANNEL_ID = process.env.DISCORD_TRAININGS_CHANNEL_ID || FALLBACK_CHANNEL;
export const DIVISIONS_CHANNEL_ID = process.env.DISCORD_DIVISIONS_CHANNEL_ID || FALLBACK_CHANNEL;
export const APPLICATIONS_LOG_CHANNEL_ID =
  process.env.DISCORD_APPLICATIONS_LOG_CHANNEL_ID || '1564285919564136711';

function headers() {
  return {
    Authorization: `Bot ${process.env.DISCORD_BOT_TOKEN}`,
    'Content-Type': 'application/json',
  };
}

export async function postMessage(channelId: string, payload: object): Promise<string | null> {
  if (!process.env.DISCORD_BOT_TOKEN) return null;
  try {
    const res = await fetch(`${API}/channels/${channelId}/messages`, {
      method: 'POST',
      headers: headers(),
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      console.error('Discord post failed:', res.status, await res.text());
      return null;
    }
    return (await res.json()).id as string;
  } catch (err) {
    console.error('Discord post error:', err);
    return null;
  }
}

export async function editMessage(channelId: string, messageId: string, payload: object): Promise<boolean> {
  if (!process.env.DISCORD_BOT_TOKEN) return false;
  try {
    const res = await fetch(`${API}/channels/${channelId}/messages/${messageId}`, {
      method: 'PATCH',
      headers: headers(),
      body: JSON.stringify(payload),
    });
    return res.ok;
  } catch {
    return false;
  }
}

export async function deleteMessage(channelId: string, messageId: string): Promise<void> {
  if (!process.env.DISCORD_BOT_TOKEN) return;
  await fetch(`${API}/channels/${channelId}/messages/${messageId}`, {
    method: 'DELETE',
    headers: headers(),
  }).catch(() => {});
}

export async function logEmbed(
  title: string,
  description: string,
  fields: { name: string; value: string; inline?: boolean }[],
  color = 5793266
) {
  await postMessage(APPLICATIONS_LOG_CHANNEL_ID, {
    embeds: [{ title, description, color, fields, timestamp: new Date().toISOString() }],
    allowed_mentions: { parse: [] },
  });
}
