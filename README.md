# DarkSystem Bot

DarkSystem Bot, AniZen TR icin hazirlanan Discord.js v14 tabanli cok amacli bottur. Kayit, davet, eglence, moderasyon, hatirlatma, anket, cekilis ve AI asistan ozellikleri ayni runtime altinda calisir.

## Gereksinimler

- Node.js 22.5 veya daha yeni surum
- Kalici disk alanina sahip VPS, mini PC ya da benzer 7/24 ortam
- Discord bot token ve hedef sunucu ID'si

## Kurulum

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

## Veri Katmani

Bot artik SQLite kullanir. Varsayilan dosya `data/darksystem.sqlite` yolundadir. Bu dosya ve yedekler git disinda tutulur.

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

## Yonetim Komutlari

- `/botdurum`: runtime, ping, komut sayisi, RAM ve SQLite durumunu gosterir.
- `/kurulum`: zorunlu ve onerilen env degerlerini kontrol eder.
- `/ayar`: sunucu ayarlarini SQLite uzerinden listeler, gosterir ve kaydeder.
- `/yedekal`: SQLite yedegi olusturur.
- `/yedekbilgi`: tablo sayaclarini gosterir.

## Guvenlik Notlari

- `.env` ve SQLite dosyalari commit edilmez.
- AI yazma ve degistirme araclari buton onayi ister.
- AI uzerinden onaylanan yazma ve degistirme islemleri audit log'a yazilir.
- Gercek secret degerlerini Discord mesajlarina veya README icine yazma.
