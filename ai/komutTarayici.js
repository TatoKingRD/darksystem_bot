// ai/komutTarayici.js
// commands/ klasöründeki tüm komutları tarayıp AI tool formatına çevirir.
// Bu sayede her yeni komut için manuel tool yazmak gerekmez.

const fs = require('fs');
const path = require('path');

// AI'ye açmak İSTEMEDİĞİMİZ komutlar (event tabanlı veya özel UI'lı olanlar)
const KARA_LISTE = [
  'yardim',      // kendisi yardım metnini yazsın zaten
  'hosgeldin',   // event (yeni üye girince)
  'rankguncelle',// arka plan işi
  'dmhatirlatma',// DM event
  'eglence',     // interaction tabanlı oyunlar
];

// Discord.js option tipinden JSON schema tipine çeviri
// ApplicationCommandOptionType: https://discord.com/developers/docs/interactions/application-commands
const TIP_MAP = {
  3: 'string',    // STRING
  4: 'integer',   // INTEGER
  5: 'boolean',   // BOOLEAN
  6: 'string',    // USER (ID olarak alıyoruz)
  7: 'string',    // CHANNEL
  8: 'string',    // ROLE
  9: 'string',    // MENTIONABLE
  10: 'number',   // NUMBER
};

function optionsParse(opts) {
  const properties = {};
  const required = [];
  for (const o of opts || []) {
    // Subcommand/SubcommandGroup atla (1, 2) - karmaşık, basit tut
    if (o.type === 1 || o.type === 2) continue;
    const json = o.toJSON ? o.toJSON() : o;
    properties[json.name] = {
      type: TIP_MAP[json.type] || 'string',
      description: json.description || '',
    };
    if (json.required) required.push(json.name);
  }
  return { properties, required };
}

function komutuAraciFormatina(cmd) {
  const json = cmd.data.toJSON ? cmd.data.toJSON() : cmd.data;
  const { properties, required } = optionsParse(json.options || []);
  return {
    ad: json.name,
    aciklama: json.description || '',
    properties,
    required,
  };
}

function komutlariTara(commandsKlasoru) {
  const komutlar = [];
  const dosyalar = fs.readdirSync(commandsKlasoru).filter(f => f.endsWith('.js'));

  for (const dosya of dosyalar) {
    const isim = dosya.replace('.js', '').toLowerCase();
    if (KARA_LISTE.includes(isim)) continue;
    try {
      const modul = require(path.join(commandsKlasoru, dosya));
      // 3 format destegi:
      // 1) module.exports = { data, execute }
      // 2) module.exports = { commands: [...] }
      // 3) module.exports = [...]  (dizi direkt)
      let komutListesi = [];
      if (Array.isArray(modul)) {
        komutListesi = modul;
      } else if (modul.commands && Array.isArray(modul.commands)) {
        komutListesi = modul.commands;
      } else if (modul.data && modul.execute) {
        komutListesi = [modul];
      }
      for (const c of komutListesi) {
        if (c?.data && c?.execute) komutlar.push(komutuAraciFormatina(c));
      }
    } catch (e) {
      console.warn(`[komutTarayici] ${dosya} okunamadi:`, e.message);
    }
  }

  return komutlar;
}

// AI'ye verilecek tek bir "slash_komut_calistir" aracı döner (dinamik açıklamalı)
function slashAraciOlustur(komutlar) {
  const komutListesi = komutlar.map(k => {
    const params = Object.entries(k.properties || {})
      .map(([ad, o]) => `${ad}${k.required.includes(ad) ? '' : '?'}: ${o.type}${o.description ? ` (${o.description})` : ''}`)
      .join(', ');
    return `  • ${k.ad}${params ? '(' + params + ')' : ''}: ${k.aciklama}`;
  }).join('\n');

  return {
    type: 'function',
    function: {
      name: 'slash_komut_calistir',
      description:
        `Sunucudaki mevcut slash komutlarından birini çalıştırır. Mevcut komutlar ve parametreleri:\n${komutListesi}\n\n` +
        `parametreler objesine bu komutun beklediği alanları koy. Kullanıcı "ben"/"bana" diyorsa kullanici parametresi için MEVCUT_KULLANICI yaz.`,
      parameters: {
        type: 'object',
        properties: {
          komut_adi: { type: 'string', description: 'Çalıştırılacak slash komutunun adı (örn: profil, uyar, kacgun)' },
          parametreler: { type: 'object', description: 'Komuta verilecek parametreler (komutun beklediği alan adlarıyla)' },
        },
        required: ['komut_adi'],
      },
    },
  };
}

module.exports = { komutlariTara, slashAraciOlustur };
