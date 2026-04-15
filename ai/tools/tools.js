// ai/tools/index.js

const ARACLAR = [
  {
    type: 'function',
    function: {
      name: 'kanal_adi_degistir',
      description: 'Bir kanalın adını değiştirir. Kullanıcı "bu kanalın adını X yap" diyorsa kanal_adi olarak mevcut kanal adını kullan.',
      parameters: {
        type: 'object',
        properties: {
          kanal_adi: { type: 'string', description: 'Mevcut kanal adı (kullanıcı "bu kanal" diyorsa sistem mesajındaki MEVCUT_KANAL değerini kullan)' },
          yeni_ad: { type: 'string', description: 'Yeni kanal adı' },
        },
        required: ['kanal_adi', 'yeni_ad'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'kanal_olustur',
      description: 'Yeni bir kanal oluşturur',
      parameters: {
        type: 'object',
        properties: {
          kanal_adi: { type: 'string', description: 'Yeni kanalın adı' },
        },
        required: ['kanal_adi'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'kanal_sil',
      description: 'Bir kanalı siler',
      parameters: {
        type: 'object',
        properties: {
          kanal_adi: { type: 'string', description: 'Silinecek kanalın adı' },
        },
        required: ['kanal_adi'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'kanal_listele',
      description: 'Sunucudaki tüm kanalları listeler',
      parameters: { type: 'object', properties: {} },
    },
  },
  {
    type: 'function',
    function: {
      name: 'kanal_temizle',
      description: 'Tüm kanalların başındaki özel karakter ve emojileri kaldırır',
      parameters: { type: 'object', properties: {} },
    },
  },
  {
    type: 'function',
    function: {
      name: 'kanal_tek_temizle',
      description: 'Tek bir kanalın başındaki emoji veya özel karakterleri kaldırır.',
      parameters: {
        type: 'object',
        properties: {
          kanal_adi: { type: 'string', description: 'Temizlenecek kanalın adı' },
        },
        required: ['kanal_adi'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'kanal_emoji_ekle',
      description: 'Tüm kanallara adlarına uygun emoji ekler',
      parameters: { type: 'object', properties: {} },
    },
  },
  {
    type: 'function',
    function: {
      name: 'uye_ban',
      description: 'Bir üyeyi sunucudan banlar',
      parameters: {
        type: 'object',
        properties: {
          kullanici_id: { type: 'string', description: 'Kullanıcı ID veya mention' },
          sebep: { type: 'string', description: 'Ban sebebi' },
        },
        required: ['kullanici_id'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'uye_kick',
      description: 'Bir üyeyi sunucudan atar',
      parameters: {
        type: 'object',
        properties: {
          kullanici_id: { type: 'string', description: 'Kullanıcı ID veya mention' },
          sebep: { type: 'string', description: 'Kick sebebi' },
        },
        required: ['kullanici_id'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'uye_sustur',
      description: 'Bir üyeyi geçici olarak susturur',
      parameters: {
        type: 'object',
        properties: {
          kullanici_id: { type: 'string', description: 'Kullanıcı ID veya mention' },
          sure: { type: 'string', description: 'Süre: 60s, 5m, 10m, 1h, 1g, 1w' },
          sebep: { type: 'string', description: 'Susturma sebebi' },
        },
        required: ['kullanici_id'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'rol_ver',
      description: 'Kullanıcıya rol verir',
      parameters: {
        type: 'object',
        properties: {
          kullanici_id: { type: 'string', description: 'Kullanıcı ID veya mention' },
          rol_adi: { type: 'string', description: 'Rol adı' },
        },
        required: ['kullanici_id', 'rol_adi'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'rol_al',
      description: 'Kullanıcıdan rol alır',
      parameters: {
        type: 'object',
        properties: {
          kullanici_id: { type: 'string', description: 'Kullanıcı ID veya mention' },
          rol_adi: { type: 'string', description: 'Rol adı' },
        },
        required: ['kullanici_id', 'rol_adi'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'kanal_kategori_duzenle',
      description: 'Sunucudaki kanalları uygun kategorilere taşır ve düzenler.',
      parameters: { type: 'object', properties: {} },
    },
  },
];

// Onay gerektirmeyen işlemler
const ONAYSIZ = ['kanal_listele', 'kanal_temizle', 'kanal_tek_temizle', 'kanal_emoji_ekle', 'kanal_kategori_duzenle'];

module.exports = { ARACLAR, ONAYSIZ };
