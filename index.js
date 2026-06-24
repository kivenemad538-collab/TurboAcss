const { Client, GatewayIntentBits } = require('discord.js');

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers
  ]
});

const BOARDING_ROLE_ID = '1516991167982735451';
const HIDE_COMMUNITY_ROLE_ID = 1516991502839054378';

client.on('guildMemberUpdate', async (oldMember, newMember) => {
  const hasBoarding = newMember.roles.cache.has(BOARDING_ROLE_ID);
  const hasHide = newMember.roles.cache.has(HIDE_COMMUNITY_ROLE_ID);

  if (hasBoarding && !hasHide) {
    await newMember.roles.add(HIDE_COMMUNITY_ROLE_ID);
  }

  if (!hasBoarding && hasHide) {
    await newMember.roles.remove(HIDE_COMMUNITY_ROLE_ID);
  }
});

client.login(process.env.TOKEN);
