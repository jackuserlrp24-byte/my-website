import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';
import { parseSessionCookie, SESSION_COOKIE } from '@/lib/discord-auth';

export const dynamic = 'force-dynamic';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const GUILD_ID = (process.env.DISCORD_GUILD_ID || process.env.DISCORD_SERVER_ID)!;
const BOT_TOKEN = process.env.DISCORD_BOT_TOKEN!;
import { WHITELIST_LOG_CHANNEL_ID } from '@/lib/training-config'; // whitelist logs channel

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
    const body = await req.json();
    const { forename, surname, dob, email, rpName, referralSource, rpExperience } = body;

    // Identity comes from the signed-in session, never from the request body
    const session = parseSessionCookie((await cookies()).get(SESSION_COOKIE)?.value);
    if (!session) {
      return NextResponse.json({ error: 'Your login has expired. Please connect Discord again.' }, { status: 401 });
    }
    const discordId = session.id;

    if (!GUILD_ID || !BOT_TOKEN) {
      console.error('Whitelist: DISCORD_GUILD_ID / DISCORD_BOT_TOKEN not set');
      return NextResponse.json({ error: 'Server is missing Discord configuration (DISCORD_GUILD_ID / DISCORD_BOT_TOKEN).' }, { status: 500 });
    }

    if (!discordId || !forename || !surname || !dob || !email || !rpName || !referralSource || !rpExperience) {
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

    if (!memberRes.ok) {
      console.error('Whitelist: member lookup failed', memberRes.status, await memberRes.text().catch(() => ''));
      return NextResponse.json({ error: `Could not read your Discord server profile (${memberRes.status}). Please try again.` }, { status: 502 });
    }

    const memberData = await memberRes.json();
    const currentRoles: string[] = memberData.roles || [];

    // 2. Database Insert / Update
    const { data: existingApp } = await supabase
      .from('user_whitelists')
      .select('collar_number')
      .eq('discord_id', discordId)
      .maybeSingle();

    let collarNumber: number;

    if (existingApp && existingApp.collar_number) {
      const { error: updateError } = await supabase
        .from('user_whitelists')
        .update({
          forename,
          surname,
          dob,
          email,
          rp_name: rpName,
          referral_source: referralSource,
          rp_experience: rpExperience
        })
        .eq('discord_id', discordId);

      if (updateError) {
        console.error('Supabase update error:', updateError);
        return NextResponse.json({ error: `Database Update Failed: ${updateError.message}` }, { status: 500 });
      }
      collarNumber = existingApp.collar_number;
    } else {
      const { data: newApp, error: insertError } = await supabase
        .from('user_whitelists')
        .insert({
          discord_id: discordId,
          forename,
          surname,
          dob,
          email,
          rp_name: rpName,
          referral_source: referralSource,
          rp_experience: rpExperience
        })
        .select('collar_number')
        .single();

      if (insertError) {
        console.error('Supabase insert error:', insertError);
        return NextResponse.json({ error: `Database Insert Failed: ${insertError.message}` }, { status: 500 });
      }
      collarNumber = newApp.collar_number;
    }

    const formattedNickname = `[${collarNumber}] ${rpName}`;

    // 3. Update Guild Member Roles and Nickname
    const updatedRoles = Array.from(
      new Set([
        ...currentRoles.filter((r) => r !== UNVERIFIED_ROLE),
        ...WHITELIST_ROLES
      ])
    );

    const patchBody = { roles: updatedRoles, nick: formattedNickname };
    const patchUrl = `https://discord.com/api/v10/guilds/${GUILD_ID}/members/${discordId}`;
    const patchHeaders = { Authorization: `Bot ${BOT_TOKEN}`, 'Content-Type': 'application/json' };

    let patchRes = await fetch(patchUrl, { method: 'PATCH', headers: patchHeaders, body: JSON.stringify(patchBody) });

    if (!patchRes.ok) {
      console.error('Whitelist: role+nick update failed', patchRes.status, await patchRes.text().catch(() => ''));
      // Nickname can fail (e.g. server owner / higher role). Roles are what unlock the portal, so retry roles alone.
      patchRes = await fetch(patchUrl, { method: 'PATCH', headers: patchHeaders, body: JSON.stringify({ roles: updatedRoles }) });
      if (!patchRes.ok) {
        const detail = await patchRes.text().catch(() => '');
        console.error('Whitelist: roles-only update failed', patchRes.status, detail);
        return NextResponse.json(
          { error: `Application saved but Discord roles could not be assigned (${patchRes.status}). Make sure the bot has Manage Roles and its role is above the whitelist roles, then submit again.` },
          { status: 502 }
        );
      }
    }

    // 4. Send Channel Audit Log Embed (Cleaned without emojis)
    try {
      await fetch(`https://discord.com/api/v10/channels/${WHITELIST_LOG_CHANNEL_ID}/messages`, {
        method: 'POST',
        headers: {
          Authorization: `Bot ${BOT_TOKEN}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          embeds: [
            {
              title: 'Whitelist Application Submitted',
              description: 'A new whitelist application has been processed and automatically assigned in-game parameters.',
              color: 3092790, // Central Operations Blue
              fields: [
                {
                  name: 'User Identity',
                  value: `**Full Name:** ${forename} ${surname}\n**DOB:** ${dob}\n**Email:** ${email}`,
                  inline: true
                },
                {
                  name: 'Roleplay Parameters',
                  value: `**RP Name:** ${rpName}\n**Collar Number:** \`[${collarNumber}]\`\n**Formatted Nick:** \`${formattedNickname}\``,
                  inline: true
                },
                {
                  name: 'Discord Account',
                  value: `**User:** <@${discordId}>\n**ID:** \`${discordId}\``,
                  inline: false
                },
                {
                  name: 'Referral Source',
                  value: referralSource || 'None provided',
                  inline: true
                },
                {
                  name: 'RP Background / Experience',
                  value: rpExperience || 'None provided',
                  inline: false
                }
              ],
              footer: {
                text: 'Central Operations Portal ┃ Automated Audit Logs'
              },
              timestamp: new Date().toISOString()
            }
          ]
        })
      });
    } catch (logErr) {
      console.error('Failed to dispatch channel log embed:', logErr);
    }

    // 5. Send Direct Message Welcome Embed to User
    try {
      const dmChannelRes = await fetch('https://discord.com/api/v10/users/@me/channels', {
        method: 'POST',
        headers: {
          Authorization: `Bot ${BOT_TOKEN}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ recipient_id: discordId })
      });

      if (dmChannelRes.ok) {
        const dmChannel = await dmChannelRes.json();

        await fetch(`https://discord.com/api/v10/channels/${dmChannel.id}/messages`, {
          method: 'POST',
          headers: {
            Authorization: `Bot ${BOT_TOKEN}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            embeds: [
              {
                title: 'Central Operations ┃ Whitelist Complete',
                description: [
                  '**Welcome to Central Operations!**',
                  '',
                  'You have successfully been processed into our systems and are now fully cleared to access all server facilities and begin your roleplay experience. Please remember that we maintain exceptionally high standards for roleplay—any form of failRP, rule-breaking, or trolling will not be tolerated.',
                  '',
                  '**Roleplay Name:**',
                  `\`\`\`${rpName}\`\`\``,
                  '',
                  '**Collar Number:**',
                  `\`\`\`[${collarNumber}] ${rpName}\`\`\``,
                  '',
                  '**Open Application:** You can find open applications here https://discord.com/channels/1497557904704671808/1497557905753378889',
                  '',
                  '**Getting Started:** Review everything you need to know about starting your journey in our booklet here: https://docs.google.com/presentation/d/1nY-VqqffYNStfZfAEs-fkHqQoTNJ0bnsxJp4gb2RP9I/edit?slide=id.p#slide=id.p'
                ].join('\n'),
                color: 3092790
              }
            ]
          })
        });
      }
    } catch (dmErr) {
      console.error('Discord DM dispatch failed:', dmErr);
    }

    return NextResponse.json({ success: true, collarNumber, nickname: formattedNickname });
  } catch (error) {
    console.error('Internal whitelist POST error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}