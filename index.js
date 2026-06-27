const {
  Client,
  GatewayIntentBits,
  Events
} = require("discord.js");

require("dotenv").config();

const TOKEN = process.env.TOKEN;

// IDs
const GUILD_ID = "1492895005725954159";

// رولات فريق التقديمات
const APPLICATION_TEAM_ROLE_ID = "1516990519232827412";
const APPLICATION_MANAGER_ROLE_ID = "1520110954296250650";

// رول المجتمع وتصريح الدخول
const COMMUNITY_ROLE_ID = "1516991502839054378";
const ENTRY_PERMISSION_ROLE_ID = "1516991167982735451";

// أول اتنين Text Channels والتالت Voice Channel
const TEXT_CHANNEL_IDS = [
  "1517157325125976235",
  "1517157396407914686"
];

const VOICE_CHANNEL_ID = "1517157524212682833";

// كل الرومات اللي هيتطبق عليها المنع لرول المجتمع + تصريح الدخول
const PROTECTED_CHANNEL_IDS = [
  ...TEXT_CHANNEL_IDS,
  VOICE_CHANNEL_ID
];

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers
  ]
});

function hasApplicationRole(member) {
  return (
    member.roles.cache.has(APPLICATION_TEAM_ROLE_ID) ||
    member.roles.cache.has(APPLICATION_MANAGER_ROLE_ID)
  );
}

function hasCommunityAndEntry(member) {
  return (
    member.roles.cache.has(COMMUNITY_ROLE_ID) &&
    member.roles.cache.has(ENTRY_PERMISSION_ROLE_ID)
  );
}

async function fetchChannel(guild, channelId) {
  try {
    const channel = await guild.channels.fetch(channelId);

    if (!channel) {
      console.error(`❌ Channel not found: ${channelId}`);
      return null;
    }

    return channel;
  } catch (err) {
    console.error(`❌ Failed to fetch channel: ${channelId}`, err);
    return null;
  }
}

async function deleteOverwriteIfExists(channel, memberId) {
  const overwrite = channel.permissionOverwrites.cache.get(memberId);

  if (overwrite) {
    await channel.permissionOverwrites.delete(memberId);
  }
}

async function giveTextAccess(member) {
  for (const channelId of TEXT_CHANNEL_IDS) {
    const channel = await fetchChannel(member.guild, channelId);
    if (!channel) continue;

    await channel.permissionOverwrites.edit(member.id, {
      ViewChannel: true,
      SendMessages: true,
      ReadMessageHistory: true,
      AddReactions: true,
      AttachFiles: true,
      EmbedLinks: true,
      UseApplicationCommands: true
    });
  }
}

async function giveVoiceAccess(member) {
  const channel = await fetchChannel(member.guild, VOICE_CHANNEL_ID);
  if (!channel) return;

  await channel.permissionOverwrites.edit(member.id, {
    ViewChannel: true,
    Connect: true,
    Speak: true,
    Stream: true,
    UseVAD: true,
    PrioritySpeaker: true,
    MuteMembers: true,
    DeafenMembers: true,
    MoveMembers: true,
    ManageEvents: true,
    UseSoundboard: true,
    UseExternalSounds: true,
    SetVoiceChannelStatus: true
  });
}

async function blockProtectedChannels(member) {
  for (const channelId of PROTECTED_CHANNEL_IDS) {
    const channel = await fetchChannel(member.guild, channelId);
    if (!channel) continue;

    await channel.permissionOverwrites.edit(member.id, {
      ViewChannel: false
    });
  }
}

async function clearProtectedOverwrites(member) {
  for (const channelId of PROTECTED_CHANNEL_IDS) {
    const channel = await fetchChannel(member.guild, channelId);
    if (!channel) continue;

    await deleteOverwriteIfExists(channel, member.id);
  }
}

async function updateMemberAccess(member) {
  if (!member || member.user.bot) return;

  const applicationRole = hasApplicationRole(member);
  const communityAndEntry = hasCommunityAndEntry(member);

  // فريق التقديمات دايمًا يشوف الرومات المحددة
  if (applicationRole) {
    await giveTextAccess(member);
    await giveVoiceAccess(member);
    return;
  }

  // اللي معاه رول المجتمع + تصريح الدخول ميشوفش الرومات المحددة
  if (communityAndEntry) {
    await blockProtectedChannels(member);
    return;
  }

  // لو مش معاه فريق تقديمات ومش معاه الرولين مع بعض، امسح الأوفررايد الشخصي
  await clearProtectedOverwrites(member);
}

client.once(Events.ClientReady, async () => {
  console.log(`✅ Logged in as ${client.user.tag}`);

  try {
    const guild = await client.guilds.fetch(GUILD_ID);

    console.log("🔄 Checking all members permissions...");

    await guild.members.fetch();

    for (const member of guild.members.cache.values()) {
      await updateMemberAccess(member);
    }

    console.log("✅ All member permissions checked");
  } catch (err) {
    console.error("Startup Error:", err);
  }
});

client.on(Events.GuildMemberUpdate, async (oldMember, newMember) => {
  const watchedRoles = [
    APPLICATION_TEAM_ROLE_ID,
    APPLICATION_MANAGER_ROLE_ID,
    COMMUNITY_ROLE_ID,
    ENTRY_PERMISSION_ROLE_ID
  ];

  const roleChanged = watchedRoles.some(roleId =>
    oldMember.roles.cache.has(roleId) !== newMember.roles.cache.has(roleId)
  );

  if (!roleChanged) return;

  try {
    await updateMemberAccess(newMember);
    console.log(`✅ Updated access for ${newMember.user.tag}`);
  } catch (err) {
    console.error(`❌ Update Access Error for ${newMember.user.tag}:`, err);
  }
});

client.login(TOKEN);
