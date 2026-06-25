const { Client, GatewayIntentBits, PermissionsBitField } = require('discord.js');

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers
  ]
});

const COMMUNITY_ROLE_ID = '1516991502839054378';
const BOARDING_ROLE_ID = '1516991167982735451';

const CHANNELS_TO_HIDE = [
  '1517157396407914686',
  '1517157325125976235'
];

client.on('guildMemberUpdate', async (oldMember, newMember) => {
  const hasCommunity = newMember.roles.cache.has(COMMUNITY_ROLE_ID);
  const hasBoarding = newMember.roles.cache.has(BOARDING_ROLE_ID);

  const shouldHide = hasCommunity && hasBoarding;

  for (const channelId of CHANNELS_TO_HIDE) {
    const channel = newMember.guild.channels.cache.get(channelId);

    if (!channel) continue;

    try {
      if (shouldHide) {
        await channel.permissionOverwrites.edit(newMember.id, {
          ViewChannel: false
        });
      } else {
        await channel.permissionOverwrites.delete(newMember.id).catch(() => {});
      }
    } catch (err) {
      console.error(err);
    }
  }
});

client.once('ready', () => {
  console.log('${client.user.tag} Online');
});

client.login(process.env.TOKEN);
