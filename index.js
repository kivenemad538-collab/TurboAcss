const {
  Client,
  GatewayIntentBits,
  Events,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  PermissionsBitField
} = require("discord.js");

require("dotenv").config();

const TOKEN = process.env.TOKEN;

// IDs
const GUILD_ID = "1492895005725954159";
const PANEL_CHANNEL_ID = "1517218130768957510";

// الرولات
const APPLICATION_TEAM_ROLE_ID = "1516990519232827412";
const APPLICATION_MANAGER_ROLE_ID = "1520110954296250650";

// أول اتنين Text Channels
const TEXT_CHANNEL_IDS = [
  "1517157325125976235",
  "1517157396407914686"
];

// التالت Voice Channel
const VOICE_CHANNEL_ID = "1517157524212682833";

// مين يقدر يستخدم البانل
const ALLOWED_ADMIN_ROLES = [
  APPLICATION_MANAGER_ROLE_ID
];

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers
  ]
});

const panelButtons = new ActionRowBuilder().addComponents(
  new ButtonBuilder()
    .setCustomId("add_application_team")
    .setLabel("فريق التقديمات")
    .setEmoji("👥")
    .setStyle(ButtonStyle.Primary),

  new ButtonBuilder()
    .setCustomId("add_application_manager")
    .setLabel("مسؤول التقديمات")
    .setEmoji("🛡️")
    .setStyle(ButtonStyle.Danger)
);

client.once(Events.ClientReady, async () => {
  console.log('✅ Logged in as ${client.user.tag}');

  try {
    const guild = await client.guilds.fetch(GUILD_ID);
    const channel = await guild.channels.fetch(PANEL_CHANNEL_ID);

    const embed = new EmbedBuilder()
      .setColor("Red")
      .setTitle("لوحة صلاحيات التقديمات")
      .setDescription("اختار الرتبة، وبعدها اكتب ID الشخص.");

    await channel.send({
      embeds: [embed],
      components: [panelButtons]
    });

    console.log("✅ Panel sent");
  } catch (err) {
    console.error("Panel Error:", err);
  }
});

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
    UseVAD: true
  };
}

function managerVoicePermissions() {
  return {
    ViewChannel: true,
    Connect: true,
    Speak: true,
    Stream: true,
    UseVAD: true,
    MuteMembers: true,
    DeafenMembers: true,
    MoveMembers: true,
    PrioritySpeaker: true
  };
}

async function giveAccess(guild, member, roleId) {
  const isManager = roleId === APPLICATION_MANAGER_ROLE_ID;

  for (const channelId of TEXT_CHANNEL_IDS) {
    const channel = await guild.channels.fetch(channelId);

    await channel.permissionOverwrites.edit(member.id, isManager
      ? managerTextPermissions()
      : teamTextPermissions()
    );
  }

  const voiceChannel = await guild.channels.fetch(VOICE_CHANNEL_ID);

  await voiceChannel.permissionOverwrites.edit(member.id, isManager
    ? managerVoicePermissions()
    : teamVoicePermissions()
  );
}

async function removeAccess(guild, memberId) {
  for (const channelId of TEXT_CHANNEL_IDS) {
    const channel = await guild.channels.fetch(channelId);
    await channel.permissionOverwrites.delete(memberId).catch(() => {});
  }

  const voiceChannel = await guild.channels.fetch(VOICE_CHANNEL_ID);
  await voiceChannel.permissionOverwrites.delete(memberId).catch(() => {});
}

client.on(Events.InteractionCreate, async (interaction) => {
  if (!interaction.isButton()) return;

  if (
    interaction.customId !== "add_application_team" &&
    interaction.customId !== "add_application_manager"
  ) return;

  const hasPermission =
    interaction.member.permissions.has(PermissionsBitField.Flags.Administrator) ||
    interaction.member.roles.cache.some(role => ALLOWED_ADMIN_ROLES.includes(role.id));

  if (!hasPermission) {
    return interaction.reply({
      content: "❌ ليس لديك صلاحية لاستخدام البانل.",
      ephemeral: true
    });
  }

  const modal = new ModalBuilder()
    .setCustomId('modal_${interaction.customId}')
    .setTitle("إضافة صلاحية لشخص");

  const userIdInput = new TextInputBuilder()
    .setCustomId("user_id")
    .setLabel("حط ID الشخص هنا")
    .setStyle(TextInputStyle.Short)
    .setRequired(true);

  const row = new ActionRowBuilder().addComponents(userIdInput);
  modal.addComponents(row);

  await interaction.showModal(modal);
});

client.on(Events.InteractionCreate, async (interaction) => {
  if (!interaction.isModalSubmit()) return;
  if (!interaction.customId.startsWith("modal_")) return;

  const userId = interaction.fields.getTextInputValue("user_id").trim();
  const type = interaction.customId.replace("modal_", "");

  let roleId;
  let roleName;

  if (type === "add_application_team") {
    roleId = APPLICATION_TEAM_ROLE_ID;
    roleName = "فريق التقديمات";
  } else if (type === "add_application_manager") {
    roleId = APPLICATION_MANAGER_ROLE_ID;
    roleName = "مسؤول التقديمات";
  } else {
    return interaction.reply({
      content: "❌ نوع الزر غير معروف.",
      ephemeral: true
    });
  }

  try {
    const guild = await client.guilds.fetch(GUILD_ID);
    const member = await guild.members.fetch(userId);

    await member.roles.add(roleId);
    await giveAccess(guild, member, roleId);

    return interaction.reply({
      content: '✅ تم إعطاء ${member.user.tag} رول ${roleName} والأكسس.',
      ephemeral: true
    });
  } catch (err) {
    console.error("Give Access Error:", err);

    return interaction.reply({
      content: "❌ حصل خطأ. اتأكد إن ID الشخص صحيح، وإن رول البوت أعلى من الرولات، وإن عنده Manage Roles و Manage Channels.",
      ephemeral: true
    });
  }
});

client.on(Events.GuildMemberUpdate, async (oldMember, newMember) => {
  const removedTeam =
    oldMember.roles.cache.has(APPLICATION_TEAM_ROLE_ID) &&
    !newMember.roles.cache.has(APPLICATION_TEAM_ROLE_ID);

  const removedManager =
    oldMember.roles.cache.has(APPLICATION_MANAGER_ROLE_ID) &&
    !newMember.roles.cache.has(APPLICATION_MANAGER_ROLE_ID);

  if (!removedTeam && !removedManager) return;

  const stillHasAnyAccessRole =
    newMember.roles.cache.has(APPLICATION_TEAM_ROLE_ID) ||
    newMember.roles.cache.has(APPLICATION_MANAGER_ROLE_ID);

  if (stillHasAnyAccessRole) return;

  try {
    await removeAccess(newMember.guild, newMember.id);
    console.log('✅ Removed access from ${newMember.user.tag}');
  } catch (err) {
    console.error("Remove Access Error:", err);
  }
});

client.login(TOKEN);
