# DarkSystem Production Notes

## Recommended hosting

Low-cost VPS or a small always-on PC is the default target. The bot uses SQLite, so persistent disk is important. Avoid free hosts that regularly sleep or wipe local files.

## Start command

```powershell
npm.cmd start
```

For Linux VPS:

```bash
npm install
npm run check
npm start
```

Use a process manager such as `pm2` or `systemd` in production.

## Backup

Use `/yedekal` in Discord or copy the SQLite file while the bot is stopped. Backups are written under `backups/` and are intentionally ignored by git.

## Health checks

Use `/botdurum` after deploy. Important checks:

- SQLite is ready
- Slash command count is correct
- Missing recommended env list is expected
- Ping and memory are stable

## Rollback

If a deploy fails, stop the process, restore the previous git commit, restore the latest SQLite backup if needed, then start the bot again.
