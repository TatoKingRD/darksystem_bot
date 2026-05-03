// ai/tools.js

const ARACLAR = [
  // ─── KANAL İŞLEMLERİ ───
  {
    type: 'function',
    function: {
      name: 'kanal_adi_degistir',
      description: 'Bir kanalın adını değiştirir.',
      parameters: {
        type: 'object',
        properties: {
          kanal_adi: { type: 'string', description: 'Mevcut kanal adı (kullanıcı "bu kanal" diyorsa MEVCUT_KANAL değerini kullan)' },
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
      name: 'kanal_kategori_duzenle',
      description: 'Sunucudaki kanalları uygun kategorilere taşır ve düzenler.',
      parameters: { type: 'object', properties: {} },
    },
  },
  {
    type: 'function',
    function: {
      name: 'mesaj_gonder',
      description: 'Belirtilen kanala mesaj veya duyuru gönderir. Kullanıcı "buraya", "bu kanala", "şuraya", "burada" gibi mevcut kanalı kastediyorsa kanal_adi için MEVCUT_KANAL değerini kullan. Kanal adı belirtilmemişse yine MEVCUT_KANAL değerini kullan.',
      parameters: {
        type: 'object',
        properties: {
          kanal_adi: { type: 'string', description: 'Mesajın gönderileceği kanal adı. Kullanıcı "buraya / bu kanala / şuraya" diyorsa veya hiç kanal belirtmediyse MEVCUT_KANAL değerini yaz.' },
          mesaj: { type: 'string', description: 'Gönderilecek mesaj içeriği' },
          embed: { type: 'boolean', description: 'Embed olarak gönder (true/false)' },
          baslik: { type: 'string', description: 'Embed başlığı (embed true ise)' },
        },
        required: ['kanal_adi', 'mesaj'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'mesaj_sabitle',
      description: 'Kanalın son mesajını sabitle veya mevcut sabiti kaldır',
      parameters: {
        type: 'object',
        properties: {
          kanal_adi: { type: 'string', description: 'Kanal adı' },
          islem: { type: 'string', description: '"sabitle" veya "kaldir"' },
        },
        required: ['kanal_adi', 'islem'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'kanal_yavasla',
      description: 'Kanala yavaş mod uygular veya kaldırır',
      parameters: {
        type: 'object',
        properties: {
          kanal_adi: { type: 'string', description: 'Kanal adı (boş bırakılırsa mevcut kanal)' },
          saniye: { type: 'number', description: 'Yavaş mod süresi saniye. 0 = kaldır' },
        },
        required: ['saniye'],
      },
    },
  },

  // ─── ÜYE İŞLEMLERİ ───
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
      name: 'kullanici_bilgi',
      description: 'Bir kullanıcının kayıt bilgilerini getirir (isim, yaş, IGN, oyun ID)',
      parameters: {
        type: 'object',
        properties: {
          kullanici_id: { type: 'string', description: 'Kullanıcı ID veya mention' },
        },
        required: ['kullanici_id'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'kullanici_uyarilari',
      description: 'Bir kullanıcının uyarı sayısını ve geçmişini gösterir',
      parameters: {
        type: 'object',
        properties: {
          kullanici_id: { type: 'string', description: 'Kullanıcı ID veya mention' },
        },
        required: ['kullanici_id'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'kullanici_sure',
      description: 'Bir kullanıcının sunucuda kaç gündür olduğunu ve hesap yaşını getirir. Kullanıcı "ben" veya kendinden bahsediyorsa kullanici_id olarak MEVCUT_KULLANICI değerini kullan.',
      parameters: {
        type: 'object',
        properties: {
          kullanici_id: { type: 'string', description: 'Kullanıcı ID veya mention. Kullanıcı kendinden bahsediyorsa MEVCUT_KULLANICI.' },
        },
        required: ['kullanici_id'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'nick_degistir',
      description: 'Bir kullanıcının sunucu nickini değiştirir',
      parameters: {
        type: 'object',
        properties: {
          kullanici_id: { type: 'string', description: 'Kullanıcı ID veya mention' },
          yeni_nick: { type: 'string', description: 'Yeni nickname' },
        },
        required: ['kullanici_id', 'yeni_nick'],
      },
    },
  },

  // ─── SUNUCU BİLGİ ───
  {
    type: 'function',
    function: {
      name: 'sunucu_istatistik',
      description: 'Sunucunun istatistiklerini gösterir: toplam üye, kayıtlı üye, bu hafta kayıt sayısı',
      parameters: { type: 'object', properties: {} },
    },
  },
  {
    type: 'function',
    function: {
      name: 'rol_listele',
      description: 'Sunucudaki tüm rolleri listeler',
      parameters: { type: 'object', properties: {} },
    },
  },
  {
    type: 'function',
    function: {
      name: 'uye_listele',
      description: 'Belirli bir roldeki üyeleri listeler',
      parameters: {
        type: 'object',
        properties: {
          rol_adi: { type: 'string', description: 'Rol adı' },
        },
        required: ['rol_adi'],
      },
    },
  },

  // ─── EĞLENCE ───
  {
    type: 'function',
    function: {
      name: 'anket_olustur',
      description: 'Belirtilen kanala anket oluşturur',
      parameters: {
        type: 'object',
        properties: {
          kanal_adi: { type: 'string', description: 'Anketin gönderileceği kanal' },
          soru: { type: 'string', description: 'Anket sorusu' },
          secenek_a: { type: 'string', description: 'A seçeneği' },
          secenek_b: { type: 'string', description: 'B seçeneği' },
        },
        required: ['kanal_adi', 'soru', 'secenek_a', 'secenek_b'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'cekilis_baslat',
      description: 'Çekiliş başlatır, süre bitince kazananı duyurur',
      parameters: {
        type: 'object',
        properties: {
          kanal_adi: { type: 'string', description: 'Çekilişin yapılacağı kanal' },
          odul: { type: 'string', description: 'Ödül açıklaması' },
          sure_dakika: { type: 'number', description: 'Çekiliş süresi (dakika)' },
        },
        required: ['kanal_adi', 'odul', 'sure_dakika'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'hava_durumu',
      description: 'Belirtilen şehrin hava durumunu getirir',
      parameters: {
        type: 'object',
        properties: {
          sehir: { type: 'string', description: 'Şehir adı' },
        },
        required: ['sehir'],
      },
    },
  },
];

// Onay gerektirmeyen işlemler (zararsız ve moderasyon olmayan)
const ONAYSIZ = [
  // Okuma / listeleme
  'kanal_listele', 'sunucu_istatistik', 'rol_listele', 'uye_listele',
  'kullanici_bilgi', 'kullanici_uyarilari', 'kullanici_sure', 'hava_durumu',
];

// Dinamik olarak commands/ klasorundeki slash komutlarini tarayip ARACLAR listesine ekler.
// aiAsistan.js bunu çağırır, her isteğin başında güncel listeyi alır.
function araclariHazirla() {
  try {
    const { komutlariTara, slashAraciOlustur } = require('./komutTarayici');
    const path = require('path');
    const komutlar = komutlariTara(path.join(__dirname, '..', 'commands'));
    if (komutlar.length === 0) return ARACLAR;
    const slashAraci = slashAraciOlustur(komutlar);
    return [...ARACLAR, slashAraci];
  } catch (e) {
    console.warn('[tools] Slash komutlar yuklenemedi:', e.message);
    return ARACLAR;
  }
}

module.exports = { ARACLAR, ONAYSIZ, araclariHazirla };
