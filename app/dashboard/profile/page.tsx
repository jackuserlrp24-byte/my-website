import { cookies } from 'next/headers';

interface RoleItem {
  id: string;
  name: string;
  color: string;
  position: number;
}

// Fetch live member profile data, roles, nickname, and join date from Discord
async function fetchUserProfileData(userId: string) {
  const guildId = process.env.DISCORD_GUILD_ID || process.env.DISCORD_SERVER_ID;
  const botToken = process.env.DISCORD_BOT_TOKEN;

  if (!guildId || !botToken || !userId) {
    console.error('Missing guildId, botToken, or userId for profile fetching');
    return { username: 'Operator', nickname: null, joinedAt: null, roles: [] };
  }

  try {
    const memberRes = await fetch(`https://discord.com/api/v10/guilds/${guildId}/members/${userId}`, {
      headers: { Authorization: `Bot ${botToken}` },
      next: { revalidate: 60 }
    });

    if (!memberRes.ok) {
      console.error('Failed to fetch guild member for profile:', memberRes.status);
      return { username: 'Operator', nickname: null, joinedAt: null, roles: [] };
    }
    
    const memberData = await memberRes.json();
    const roleIds: string[] = memberData.roles || [];
    const username = memberData.user?.username || 'Operator';
    const nickname = memberData.nick || null;
    const joinedAt = memberData.joined_at || null;

    const rolesRes = await fetch(`https://discord.com/api/v10/guilds/${guildId}/roles`, {
      headers: { Authorization: `Bot ${botToken}` },
      next: { revalidate: 3600 }
    });

    if (!rolesRes.ok) {
      return { username, nickname, joinedAt, roles: [] };
    }
    const guildRoles = await rolesRes.json();
    
    const roleMap = new Map<string, { name: string; color: number; position: number }>();
    guildRoles.forEach((r: { id: string; name: string; color: number; position: number }) => {
      roleMap.set(r.id, { name: r.name, color: r.color, position: r.position });
    });

    const userRoles: RoleItem[] = roleIds
      .map((id) => {
        const role = roleMap.get(id);
        if (!role) return null;
        
        const hexColor = role.color !== 0 
          ? `#${role.color.toString(16).padStart(6, '0')}` 
          : '#a3a3a3';

        return {
          id,
          name: role.name,
          color: hexColor,
          position: role.position,
        };
      })
      .filter((r): r is RoleItem => r !== null);

    userRoles.sort((a, b) => b.position - a.position);

    return { username, nickname, joinedAt, roles: userRoles };
  } catch (err) {
    console.error('Error fetching live profile data:', err);
    return { username: 'Operator', nickname: null, joinedAt: null, roles: [] };
  }
}

export default async function ProfilePage() {
  const cookieStore = await cookies();
  const userCookie = cookieStore.get('discord_user')?.value;
  
  const user = userCookie 
    ? JSON.parse(userCookie) 
    : { username: 'Operator', nickname: 'Operator', global_name: 'Operator', id: '', avatar: null };

  const avatarUrl = user.avatar 
    ? `https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}.png` 
    : 'https://cdn.discordapp.com/embed/avatars/0.png';

  const profileData = user.id ? await fetchUserProfileData(user.id) : { username: user.username || 'Operator', nickname: null, joinedAt: null, roles: [] };

  const discordUsername = profileData.username || user.username || 'Operator';
  const serverNickname = profileData.nickname ? profileData.nickname : 'None (Using Username)';
  
  const formattedJoinDate = profileData.joinedAt 
    ? new Date(profileData.joinedAt).toLocaleDateString('en-GB', {
        day: 'numeric',
        month: 'long',
        year: 'numeric'
      })
    : 'Not Available';

  const userRoles = profileData.roles;
  const officialProfileName = serverNickname !== 'None (Using Username)' ? serverNickname : discordUsername;

  return (
    <div className="flex flex-col px-8 mt-4 max-w-[1450px] mx-auto w-full gap-4">
      <div className="w-full bg-neutral-900/90 border border-neutral-800 p-6 shadow-xl relative overflow-hidden">
        <div className="absolute top-0 left-0 right-0 h-1 bg-[#5865F2]" />
        <h2 className="text-2xl font-bold tracking-tight text-neutral-100">
          User Profile & Settings
        </h2>
        <p className="text-xs text-neutral-400 mt-1">
          Manage your connected identity, sync preferences, and clearance parameters.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Left Column: Identity Card with Integrated Ordered Roles */}
        <div className="flex flex-col gap-4">
          <div className="bg-neutral-900/80 border border-neutral-800 p-6 flex flex-col items-center text-center">
            <img 
              src={avatarUrl} 
              alt="Avatar" 
              className="w-24 h-24 rounded-full border-2 border-neutral-700 mb-4 shadow-lg object-cover" 
            />
            <h3 className="text-sm font-semibold tracking-wider text-neutral-200 uppercase mb-1">
              {officialProfileName}
            </h3>
            <p className="text-xs font-mono text-neutral-500 mb-6">
              ID: {user.id}
            </p>
            
            {/* Integrated Server Roles */}
            <div className="w-full text-left pt-4 border-t border-neutral-800">
              <span className="text-[10px] font-mono text-neutral-400 uppercase tracking-widest block mb-3 pb-2 border-b border-neutral-800">
                Server Roles ({userRoles.length})
              </span>
              <div className="flex flex-wrap gap-1.5 max-h-[420px] overflow-y-auto pr-1 [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-track]:bg-neutral-950 [&::-webkit-scrollbar-thumb]:bg-neutral-800 [&::-webkit-scrollbar-thumb]:rounded-full hover:[&::-webkit-scrollbar-thumb]:bg-neutral-700">
                {userRoles.map((role) => (
                  <span 
                    key={role.id} 
                    className="px-2.5 py-1 bg-neutral-950 border text-xs font-mono tracking-wide rounded-sm flex items-center gap-1.5"
                    style={{ 
                      borderColor: role.color !== '#a3a3a3' ? `${role.color}50` : '#262626',
                      color: role.color !== '#a3a3a3' ? role.color : '#d4d4d4'
                    }}
                  >
                    <span 
                      className="w-2 h-2 rounded-full shrink-0" 
                      style={{ backgroundColor: role.color }} 
                    />
                    @{role.name}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Right Columns */}
        <div className="lg:col-span-2 flex flex-col gap-4">
          <div className="bg-neutral-900/80 border border-neutral-800 p-6">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-neutral-200 mb-4 pb-2 border-b border-neutral-800">
              Connected Discord Credentials
            </h3>
            <div className="space-y-4">
              <div>
                <label className="block text-[11px] font-mono uppercase tracking-wider text-neutral-400 mb-1">
                  Discord Username
                </label>
                <input 
                  type="text" 
                  readOnly 
                  value={discordUsername} 
                  className="w-full bg-neutral-950 border border-neutral-800 px-3 py-2 text-xs text-neutral-300 font-mono focus:outline-none cursor-not-allowed"
                />
              </div>

              <div>
                <label className="block text-[11px] font-mono uppercase tracking-wider text-neutral-400 mb-1">
                  Server Nickname / Name in Server
                </label>
                <input 
                  type="text" 
                  readOnly 
                  value={serverNickname} 
                  className="w-full bg-neutral-950 border border-neutral-800 px-3 py-2 text-xs text-neutral-300 font-mono focus:outline-none cursor-not-allowed"
                />
              </div>

              <div>
                <label className="block text-[11px] font-mono uppercase tracking-wider text-neutral-400 mb-1">
                  Discord ID
                </label>
                <input 
                  type="text" 
                  readOnly 
                  value={user.id} 
                  className="w-full bg-neutral-950 border border-neutral-800 px-3 py-2 text-xs text-neutral-300 font-mono focus:outline-none cursor-not-allowed"
                />
              </div>

              <div>
                <label className="block text-[11px] font-mono uppercase tracking-wider text-neutral-400 mb-1">
                  Server Join Date
                </label>
                <input 
                  type="text" 
                  readOnly 
                  value={formattedJoinDate} 
                  className="w-full bg-neutral-950 border border-neutral-800 px-3 py-2 text-xs text-neutral-300 font-mono focus:outline-none cursor-not-allowed"
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}