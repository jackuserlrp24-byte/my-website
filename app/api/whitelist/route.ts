import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const GUILD_ID = process.env.DISCORD_GUILD_ID!;
const BOT_TOKEN = process.env.DISCORD_BOT_TOKEN!;

const UNVERIFIED_ROLE = '1533021619331534848';
const WHITELIST_ROLES = [
  '1533037093306105896',
  '1532781088827507038',
  '1532841715151671436',
  '1534119748416049193',
  '1532781271477129226',
  '1533023231206883338',
  '1533023096922050750',
  '1532828055154720981',
  '1532781330071425104',
  '1546219971359543408'
];

export async function POST(req: Request) {
  try {
    const { discordId, rpName, referralSource, rpExperience } = await req.json();

    if (!discordId || !rpName || !referralSource || !rpExperience) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // 1. Fetch Discord Member Info
    const memberRes = await fetch(
      `https://discord.com/api/v10/guilds/${GUILD_ID}/members/${discordId}`,
      {
        headers: { Authorization: `Bot ${BOT_TOKEN}` }
      }
    );

    if (memberRes.status === 404) {
      return NextResponse.json({ error: 'NOT_IN_SERVER' }, { status: 404 });
    }

    const memberData = await memberRes.json();
    const currentRoles: string[] = memberData.roles || [];

    // 2. Save Application & Get Unique Collar Number
    const { data: appData, error: dbError } = await supabase
      .from('user_whitelists')
      .insert({
        discord_id: discordId,
        rp_name: rpName,
        referral_source: referralSource,
        rp_experience: rpExperience
      })
      .select('collar_number')
      .single();

    if (dbError) {
      return NextResponse.json({ error: 'Failed to save application or already completed.' }, { status: 500 });
    }

    const collarNumber = appData.collar_number;
    const formattedNickname = `[${collarNumber}] ${rpName}`;

    // 3. Update Roles (Add Whitelist Roles, Remove Unverified)
    const updatedRoles = Array.from(
      new Set([
        ...currentRoles.filter((r) => r !== UNVERIFIED_ROLE),
        ...WHITELIST_ROLES
      ])
    );

    await fetch(
      `https://discord.com/api/v10/guilds/${GUILD_ID}/members/${discordId}`,
      {
        method: 'PATCH',
        headers: {
          Authorization: `Bot ${BOT_TOKEN}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          roles: updatedRoles,
          nick: formattedNickname
        })
      }
    );

    return NextResponse.json({ success: true, collarNumber, nickname: formattedNickname });
  } catch (error) {
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}