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

    // 2. Check if user already submitted an application before
    const { data: existingApp } = await supabase
      .from('user_whitelists')
      .select('collar_number')
      .eq('discord_id', discordId)
      .single();

    let collarNumber: number;

    if (existingApp) {
      // Update existing application info and keep their original collar number
      const { error: updateError } = await supabase
        .from('user_whitelists')
        .update({
          rp_name: rpName,
          referral_source: referralSource,
          rp_experience: rpExperience
        })
        .eq('discord_id', discordId);

      if (updateError) {
        return NextResponse.json({ error: 'Failed to update application.' }, { status: 500 });
      }
      collarNumber = existingApp.collar_number;
    } else {
      // Insert new application, gets next collar number from sequence
      const { data: newApp, error: insertError } = await supabase
        .from('user_whitelists')
        .insert({
          discord_id: discordId,
          rp_name: rpName,
          referral_source: referralSource,
          rp_experience: rpExperience
        })
        .select('collar_number')
        .single();

      if (insertError) {
        return NextResponse.json({ error: 'Failed to save application.' }, { status: 500 });
      }
      collarNumber = newApp.collar_number;
    }

    const formattedNickname = `[${collarNumber}] ${rpName}`;

    // 3. Update Roles (Add Whitelist Roles, Remove Unverified) & Nickname
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

    // 4. Send Discord DM Embed to User
    try {
      const dmRes = await fetch('https://discord.com/api/v10/users/@me/channels', {
        method: 'POST',
        headers: {
          Authorization: `Bot ${BOT_TOKEN}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ recipient_id: discordId })
      });

      if (dmRes.ok) {
        const dmChannel = await dmRes.json();
        const channelId = dmChannel.id;

        await fetch(`https://discord.com/api/v10/channels/${channelId}/messages`, {
          method: 'POST',
          headers: {
            Authorization: `Bot ${BOT_TOKEN}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            embeds: [
              {
                title: 'Central Operations ┃ Whitelist Complete',
                description: `**Welcome to Central Operations!**\n\nYou have successfully been processed into our systems and are now fully cleared to access all server facilities and begin your roleplay experience. Please remember that we maintain exceptionally high standards for roleplay—any form of failRP, rule-breaking, or trolling will not be tolerated.\n\n**Roleplay Name:**\`\`\`${rpName}\`\`\`\n**Collar Number:**\`\`\`[${collarNumber}] ${rpName}\`\`\`\n\n- **Applications & Channels:** You can find our community channels and further applications here: https://discord.com/channels/1497557904704671808/1497557905753378889\n- **Getting Started:** Review everything you need to know about starting your journey in our booklet here: https://docs.google.com/presentation/d/1nY-VqqffYNStfZfAEs-fkHqQoTNJ0bnsxJp4gb2RP9I/edit?slide=id.p#slide=id.p\n\n-# Central Operations Team`,
                color: 3092790
              }
            ]
          })
        });
      }
    } catch (dmError) {
      console.error('Could not send DM to user:', dmError);
    }

    return NextResponse.json({ success: true, collarNumber, nickname: formattedNickname });
  } catch (error) {
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}