import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const GUILD_ID = process.env.DISCORD_GUILD_ID!;
const BOT_TOKEN = process.env.DISCORD_BOT_TOKEN!;
const LOG_CHANNEL_ID = '1563506688798236743'; // Audit Log Channel

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
    const { discordId, forename, surname, dob, email, rpName, referralSource, rpExperience } = await req.json();

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

    // 4. Send Channel Audit Log Embed to #1563506688798236743
    try {
      await fetch(`https://discord.com/api/v10/channels/${LOG_CHANNEL_ID}/messages`, {
        method: 'POST',
        headers: {
          Authorization: `Bot ${BOT_TOKEN}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          embeds: [
            {
              title: '📋 Whitelist Application Submitted',
              description: `A new whitelist application has been processed and automatically assigned in-game parameters.`,
              color: 3092790, // Central Operations Blue
              fields: [
                {
                  name: '👤 User Identity',
                  value: `**Full Name:** ${forename} ${surname}\n**DOB:** ${dob}\n**Email:** ${email}`,
                  inline: true
                },
                {
                  name: '🎮 Roleplay Parameters',
                  value: `**RP Name:** ${rpName}\n**Collar Number:** \`[${collarNumber}]\`\n**Formatted Nick:** \`${formattedNickname}\``,
                  inline: true
                },
                {
                  name: '💬 Discord Account',
                  value: `**User:** <@${discordId}>\n**ID:** \`${discordId}\``,
                  inline: false
                },
                {
                  name: '🔍 Referral Source',
                  value: referralSource || 'None provided',
                  inline: true
                },
                {
                  name: '📜 RP Background / Experience',
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
                description: `**Welcome to Central Operations!**\n\nYou have successfully been processed into our systems and are now fully cleared to access all server facilities and begin your roleplay experience. Please remember that we maintain exceptionally high standards for roleplay—any form of failRP, rule-breaking, or trolling will not be tolerated.\n\n**Roleplay Name:**\n\`\`\`${rpName}\`\`\`\n\n**Collar Number:**\n\`\`\`[${collarNumber}] ${rpName}\`\`\`\n\n- **Applications & Channels:** You can find our community channels and further applications here: https://discord.com/channels/1497557904704671808/1497557905753378889\n- **Getting Started:** Review everything you need to know about starting your journey in our booklet here: https://docs.google.com/presentation/d/1nY-VqqffYNStfZfAEs-fkHqQoTNJ0bnsxJp4gb2RP9I/edit?slide=id.p#slide=id.p\n\n-# Central Operations Team`,
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