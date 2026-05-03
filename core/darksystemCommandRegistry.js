const fs = require('fs');
const path = require('path');
const { Collection } = require('discord.js');

function loadDarkSystemCommandRegistry(commandsDir, logger = console) {
  const commands = new Collection();
  const commandData = [];
  const files = fs.readdirSync(commandsDir)
    .filter((file) => file.endsWith('.js'))
    .sort((a, b) => a.localeCompare(b));

  for (const file of files) {
    const fullPath = path.join(commandsDir, file);
    const loaded = require(fullPath);
    const entries = normalizeCommandModule(loaded);
    for (const command of entries) {
      const data = command?.data?.toJSON ? command.data.toJSON() : command?.data;
      if (!data?.name || typeof command.execute !== 'function') continue;
      if (commands.has(data.name)) {
        throw new Error(`Duplicate slash command name "${data.name}" found while loading ${file}.`);
      }
      commands.set(data.name, command);
      commandData.push(data);
    }
    logger.debug?.('command_file_loaded', { file, commands: entries.length });
  }

  return {
    commands,
    commandData,
    files,
    names: [...commands.keys()],
  };
}

function normalizeCommandModule(loaded) {
  if (Array.isArray(loaded)) return loaded;
  if (Array.isArray(loaded?.commands)) return loaded.commands;
  if (loaded?.data && loaded?.execute) return [loaded];
  return [];
}

module.exports = {
  loadDarkSystemCommandRegistry,
  normalizeCommandModule,
};
