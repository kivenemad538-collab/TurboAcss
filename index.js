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

// حط هنا رول المجتمع وتصريح الدخول
const COMMUNITY_ROLE_ID = "1516991502839054378";
const ENTRY_PERMISSION_ROLE_ID = "1516991167982735451";

// أول اتنين Text Channels
const TEXT_CHANNEL_IDS = [
  "1517157325125976235",
  "1517157396407914686"
];

// التالت Voice Channel
const VOICE_CHANNEL_ID = "1517157524212682833";

const ALL_CHANNEL_IDS = [
  ...TEXT_CHANNEL_IDS,
  VOICE_CHANNEL_ID
];

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers
  ]
});

function hasApplicationAccess(member) {
  return (
    member.roles.cache.has(APPLICATION_TEAM_ROLE_ID) ||
    member.roles.cache.has(APPLICATION_MANAGER_ROLE_ID)
  );
}

function isApplicationManager(member) {
  return member.roles.cache.has(APPLICATION_MANAGER_ROLE_ID);
}

function hasCommunityAndEntry(member) {
  return (
    member.roles.cache.has(COMMUNITY_ROLE_ID) &&
    member.roles.cache.has(ENTRY_PERMISSION_ROLE_ID)
  );
}

function teamTextPermissions() {
  return {
    ViewChannel: true,
    SendMessages: true,
    ReadMessageHistory: true,
    AddReactions: true,
    AttachFiles: true,
    EmbedLinks: true,
    UseApplicationCommands: true
  };
}

function managerTextPermissions() {
  return {
    ViewChannel: true,
    SendMessages: true,
    ReadMessageHistory: true,
    AddReactions: true,
    AttachFiles: true,
    EmbedLinks: true,
    UseApplicationCommands: true,
    ManageMessages: true,
    ManageThreads: true,
    CreatePublicThreads: true,
    CreatePrivateThreads: true,
    SendMessagesInThreads: true,
    MentionEveryone: true
  };
}

function teamVoicePermissions() {
  return {
    ViewChannel: true,
    Connect: true,
    Speak: true,
    Stream: true,
    UseVAD: true,
    UseSoundboard: true,
    UseExternalSounds: true
  };
}

function managerVoicePermissions() {
  return {
    ViewChannel: true,
    Connect: true,
    Speak: true,
    Stream: true,
    UseVAD: true,
    UseSoundboard: true,
    UseExternalSounds: true,
    PrioritySpeaker: true,
    MuteMembers: true,
    DeafenMembers: true,
    MoveMembers: true,
    ManageEvents: true
  };
}

async function fetchChannel(guild, channelId) {
  try {
    const channel = await guild.channels.fetch(channelId);

    if (!channel) {
      console.log(`❌ الروم مش موجود: ${channelId}`);
      return null;
    }

    return channel;
  } catch (err) {
    console.log(`❌ مش عارف أجيب الروم: ${channelId}`);
    console.error(err);
    return null;
  }
}

async function deleteOverwrite(channel, memberId) {
  const overwrite = channel.permissionOverwrites.cache.get(memberId);

  if (overwrite) {
    await channel.permissionOverwrites.delete(memberId).catch(() => {});
  }
}

async function giveApplicationAccess(member) {
  const manager = isApplicationManager(member);

  for (const channelId of TEXT_CHANNEL_IDS) {
    const channel = await fetchChannel(member.guild, channelId);
    if (!channel) continue;

    await channel.permissionOverwrites.edit(
      member.id,
      manager ? managerTextPermissions() : teamTextPermissions()
    );
  }

  const voiceChannel = await fetchChannel(member.guild, VOICE_CHANNEL_ID);
  if (!voiceChannel) return;

  await voiceChannel.permissionOverwrites.edit(
    member.id,
    manager ? managerVoicePermissions() : teamVoicePermissions()
  );
}

async function blockCommunityEntry(member) {
  for (const channelId of ALL_CHANNEL_IDS) {
    const channel = await fetchChannel(member.guild, channelId);
    if (!channel) continue;

    await channel.permissionOverwrites.edit(member.id, {
      ViewChannel: false
    });
  }
}

async function clearAccess(member) {
  for (const channelId of ALL_CHANNEL_IDS) {
    const channel = await fetchChannel(member.guild, channelId);
    if (!channel) continue;

    await deleteOverwrite(channel, member.id);
  }
}

async function updateMemberAccess(member) {
  if (!member || member.user.bot) return;

  const applicationAccess = hasApplicationAccess(member);
  const communityAndEntry = hasCommunityAndEntry(member);

  // فريق التقديمات يشوف الرومات مهما كان معاه رولات تانية
  if (applicationAccess) {
    await giveApplicationAccess(member);
    return;
  }

  // اللي معاه رول المجتمع + تصريح الدخول ميشوفش الرومات المحددة
  if (communityAndEntry) {
    await blockCommunityEntry(member);
    return;
  }

  // لو مش معاه حاجة من دول، امسح الأوفررايد الشخصي
  await clearAccess(member);
}

client.once(Events.ClientReady, async () => {
  console.log(`✅ Logged in as ${client.user.tag}`);

  try {
    const guild = await client.guilds.fetch(GUILD_ID);

    console.log("🔄 Checking all members...");

    await guild.members.fetch();

    for (const member of guild.members.cache.values()) {
      await updateMemberAccess(member);
    }

    console.log("✅ Done checking all members");
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

  const changed = watchedRoles.some(roleId =>
    oldMember.roles.cache.has(roleId) !== newMember.roles.cache.has(roleId)
  );

  if (!changed) return;

  try {
    await updateMemberAccess(newMember);
    console.log(`✅ Updated access for ${newMember.user.tag}`);
  } catch (err) {
    console.error(`❌ Error updating ${newMember.user.tag}:`, err);
  }
});

client.login(TOKEN);
