# DarkSystem Production Notes

## Recommended hosting

Use a low-cost paid Linux VPS with Ubuntu 24.04 LTS, persistent disk, 1-2 vCPU, 2 GB RAM, and 20+ GB disk. This is the default for a 1000-member Discord server because it is cheap, stable, and easy to operate.

The selected database is SQLite at `data/darksystem.sqlite`. Do not provision MySQL or PostgreSQL for the first production rollout.

## First deploy on Ubuntu

Install the base system packages and Node.js 22.x:

```bash
sudo apt update
sudo apt install -y curl git build-essential
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
sudo apt install -y nodejs
node -v
```

`node -v` must be `22.5.0` or newer because the bot uses `node:sqlite`.

Clone and prepare the repo:

```bash
git clone https://github.com/TatoKingRD/darksystem_bot.git
cd darksystem_bot
npm install
cp .env.example .env
nano .env
```

Required `.env` values:

```env
BOT_TOKEN=real-discord-bot-token
GUILD_ID=discord-guild-id
OWNER_IDS=owner-discord-id
SQLITE_PATH=data/darksystem.sqlite
LOG_LEVEL=info
```

Validate the server and initialize SQLite:

```bash
npm run preflight
npm run db:init
npm run check
```

## PM2 runtime

Start the bot through the checked-in PM2 ecosystem file:

```bash
sudo npm install -g pm2
npm run pm2:start
pm2 save
pm2 startup
```

Useful runtime commands:

```bash
npm run pm2:logs
npm run pm2:restart
pm2 status
```

PM2 logs are written under `logs/`, which is ignored by git.

## SQLite operations

The first bot start or `npm run db:init` creates `data/darksystem.sqlite` and runs migrations. Keep the database on persistent disk.

Check table counts:

```bash
npm run db:status
```

Create a server-side backup:

```bash
npm run db:backup
```

Create a Discord-side backup from the server with `/yedekal`. Backups are written under `backups/` and are intentionally ignored by git.

## Health checks

After deploy, run Discord commands in this order:

1. `/kurulum`
2. `/botdurum`
3. `/yedekbilgi`

Important signals:

- SQLite is ready
- Slash command count is correct
- Missing recommended env values are known and intentional
- Ping and memory are stable

## Update and rollback

Update production:

```bash
git pull origin main
npm install
npm run check
npm run pm2:restart
```

Rollback if a deploy fails:

```bash
pm2 stop darksystem-bot
git log --oneline -5
git checkout <previous-good-commit>
npm install
npm run check
npm run pm2:start
```

If the failure affected data, restore the latest known-good SQLite backup before starting the bot again.
