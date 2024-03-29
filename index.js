/* eslint-disable consistent-return */
/* eslint-disable global-require */
/* eslint-disable import/no-dynamic-require */
const Discord = require('discord.js');
const Enmap = require('enmap');
const fs = require('fs');
const { Searcher } = require('fast-fuzzy');

const client = new Discord.Client({
  messageCacheMaxSize: 500,
  fetchAllMembers: false,
  ws: {
    intents: [
      Discord.Intents.FLAGS.GUILDS,
      Discord.Intents.FLAGS.GUILD_MEMBERS,
      Discord.Intents.FLAGS.GUILD_BANS,
      Discord.Intents.FLAGS.GUILD_EMOJIS,
      Discord.Intents.FLAGS.GUILD_VOICE_STATES,
      Discord.Intents.FLAGS.GUILD_PRESENCES,
      Discord.Intents.FLAGS.GUILD_MESSAGES,
      Discord.Intents.FLAGS.GUILD_MESSAGE_REACTIONS,
      Discord.Intents.FLAGS.DIRECT_MESSAGES,
      Discord.Intents.FLAGS.DIRECT_MESSAGE_REACTIONS,
    ],
  },
});
const config = require('./config');
const { version } = require('./package.json');
const emoji = require('./src/emoji');
require('./src/functions')(client);

client.config = config;
client.version = `v${version}`;
client.emoji = emoji;
client.previous_message = "";
client.botCommandsId = config.botChannel;
client.staffCommandsId = config.staffCommands;
fs.readdir('./events/', (err, files) => {
  if (err) {
    return console.error(err);
  }
  return files.forEach((file) => {
    const event = require(`./events/${file}`);
    const eventName = file.split('.')[0];
    client.on(eventName, event.bind(null, client));
  });
});

client.commands = new Enmap();
client.aliases = new Enmap();

fs.readdir('./commands/', (err, folders) => {
  if (err) {
    return console.error(err);
  }

  // Looping over all folders to load all commands
  for (let i = 0; i < folders.length; i++) {
    fs.readdir(`./commands/${folders[i]}/`, (error, files) => {
      if (error) {
        return console.error(error);
      }
      files.forEach((file) => {
        if (!file.endsWith('.js')) {
          return;
        }

        const props = require(`./commands/${folders[i]}/${file}`);
	const commandName = props.help.name;

        console.log(`Attempting to load command ${commandName}`);
        client.commands.set(commandName, props);

        if (props.conf.aliases) {
          props.conf.aliases.forEach((alias) => {
            client.aliases.set(alias, commandName);
          });
        }

        client.enabledCmds.ensure(commandName, true);
      });
    });
  }
});

client.levelCache = {};
for (let i = 0; i < config.permLevels.length; i++) {
  const thislvl = config.permLevels[i];
  client.levelCache[thislvl.name] = thislvl.level;
}

client.firstReady = false;

client.invites = {};

// Raid Mode
client.raidMode = false;
client.raidBanning = false;
client.raidJoins = [];
client.raidMessage = null;
client.raidMembersPrinted = 0;

// Auto-Filter Message Reminder Counts
client.imageOnlyFilterCount = 0;
client.imageAndTextOnlyFilterCount = 0;
client.newlineLimitFilterCount = 0;
client.noMentionFilterCount = 0;

Object.assign(client, Enmap.multi(['enabledCmds', 'emojiDB', 'villagerDB', 'tags', 'playlist', 'sessionDB', 'muteDB', 'reactionRoleDB', 'bannedWordsDB'], { ensureProps: true }));
Object.assign(client, Enmap.multi(['userDB', 'infractionDB', 'memberStats'], { fetchAll: false, ensureProps: true }));

// Banned words array and Searcher
const bannedWordsArray = client.bannedWordsDB.array();
client.bannedWordsFilter = new Searcher(bannedWordsArray, {
  keySelector: (s) => s.word, threshold: 1, returnMatchData: true, useSellers: false,
});
client.login(config.token).then(() => {
  console.log('Bot successfully logged in.');
}).catch(() => {
  console.log('Retrying client.login()...');
  let counter = 1;
  const interval = setInterval(() => {
    console.log(`  Retrying attempt ${counter}`);
    counter += 1;
    client.login(config.token).then(() => {
      console.log('  Bot successfully logged in.');
      clearInterval(interval);
    });
  }, 30000);
});
