# DarkSystem Bot

DarkSystem Bot, AniZen TR icin hazirlanan Discord.js v14 tabanli cok amacli bottur. Kayit, davet, eglence, moderasyon, hatirlatma, anket, cekilis ve AI asistan ozellikleri ayni runtime altinda calisir.

## Gereksinimler

- Ubuntu 24.04 LTS uzerinde dusuk maliyetli Linux VPS onerilir
- Node.js 22.5 veya daha yeni surum
- Kalici disk alanina sahip VPS, mini PC ya da benzer 7/24 ortam
- Discord bot token ve hedef sunucu ID'si

## Kurulum

### Lokal veya Windows gelistirme

1. Bagimliliklari yukle:

```powershell
npm.cmd install
```

2. `.env.example` dosyasini `.env` olarak kullan ve gercek degerleri yerelde doldur.

3. Statik kontrol ve smoke test calistir:

```powershell
npm.cmd run check
```

4. Botu baslat:

```powershell
npm.cmd start
```

### Ubuntu VPS production

1. Node.js 22.x, Git ve build araclarini kur:

```bash
sudo apt update
sudo apt install -y curl git build-essential
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
sudo apt install -y nodejs
node -v
```

2. Repoyu al ve bagimliliklari kur:

```bash
git clone https://github.com/TatoKingRD/darksystem_bot.git
cd darksystem_bot
npm install
```

3. `.env.example` dosyasini `.env` olarak kopyala ve sunucuda gercek degerleri doldur:

```bash
cp .env.example .env
nano .env
```

Minimum production degerleri:

```env
BOT_TOKEN=gercek-discord-bot-token
GUILD_ID=discord-sunucu-id
OWNER_IDS=senin-discord-id
SQLITE_PATH=data/darksystem.sqlite
LOG_LEVEL=info
```

4. Ortami ve DB'yi dogrula:

```bash
npm run preflight
npm run db:init
npm run check
```

5. PM2 ile 7/24 baslat:

```bash
sudo npm install -g pm2
npm run pm2:start
pm2 save
pm2 startup
```

## Veri Katmani

Bot artik SQLite kullanir. Varsayilan dosya `data/darksystem.sqlite` yolundadir. Bu dosya ve yedekler git disinda tutulur.
Ayri MySQL/PostgreSQL server kurulmaz. Bot ilk acilista `data/` klasorunu, SQLite dosyasini ve gerekli tablolari otomatik hazirlar.

Kalici veri kapsami:

- Kayit cache'i
- Uyarilar
- Davet sayaclari
- Eglence sayaclari
- AI konusma gecmisi
- Tekrar hatirlatmalari
- Anket oylari
- Cekilis katilimcilari
- Sunucu ayarlari ve audit log

Bakim komutlari:

```bash
npm run db:status
npm run db:backup
```

## Yonetim Komutlari

- `/botdurum`: runtime, ping, komut sayisi, RAM ve SQLite durumunu gosterir.
- `/kurulum`: zorunlu ve onerilen env degerlerini kontrol eder.
- `/ayar`: sunucu ayarlarini SQLite uzerinden listeler, gosterir ve kaydeder.
- `/yedekal`: SQLite yedegi olusturur.
- `/yedekbilgi`: tablo sayaclarini gosterir.

## Guvenlik Notlari

- `.env` ve SQLite dosyalari commit edilmez.
- `backups/` ve `logs/` klasorleri git disinda tutulur.
- AI yazma ve degistirme araclari buton onayi ister.
- AI uzerinden onaylanan yazma ve degistirme islemleri audit log'a yazilir.
- Gercek secret degerlerini Discord mesajlarina veya README icine yazma.

## Guncelleme

Production VPS uzerinde yeni surumu almak icin:

```bash
git pull origin main
npm install
npm run check
npm run pm2:restart
```
