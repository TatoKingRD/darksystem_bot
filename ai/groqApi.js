// ai/groqApi.js
const https = require('https');

// Model öncelik sırası - ilki başarısız olursa sırayla diğerleri denenir
const MODELLER = [
  'openai/gpt-oss-120b',       // Ana model (güçlü tool calling)
  'llama-3.3-70b-versatile',   // Yedek 1 (stabil, hızlı)
  'openai/gpt-oss-20b',        // Yedek 2 (daha küçük ama çok hızlı)
];

function tekSor(mesajlar, araclar, model) {
  return new Promise((resolve) => {
    const payload = {
      model,
      messages: mesajlar,
      max_tokens: 1024,
      temperature: 0.85,
      // Tekrarlayan kelimeleri ve konuları cezalandir - her seferinde farkli cevap
      frequency_penalty: 0.5,
      presence_penalty: 0.5,
    };
    if (araclar) {
      payload.tools = araclar;
      payload.tool_choice = 'auto';
    }

    const body = JSON.stringify(payload);
    const options = {
      hostname: 'api.groq.com',
      path: '/openai/v1/chat/completions',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.GROQ_API_KEY}`,
        'Content-Length': Buffer.byteLength(body),
      },
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          if (parsed.error) {
            console.error(`[groq:${model}] API hatası:`, parsed.error.message || parsed.error);
            return resolve(null);
          }
          if (!parsed.choices || !parsed.choices.length) {
            console.error(`[groq:${model}] Boş cevap:`, data.substring(0, 200));
            return resolve(null);
          }
          resolve(parsed);
        } catch (e) {
          console.error(`[groq:${model}] JSON parse hatası:`, e.message, 'data:', data.substring(0, 200));
          resolve(null);
        }
      });
    });

    req.on('error', (e) => {
      console.error(`[groq:${model}] Bağlantı hatası:`, e.message);
      resolve(null);
    });
    req.setTimeout(30000, () => {
      console.error(`[groq:${model}] Timeout (30s)`);
      req.destroy();
      resolve(null);
    });
    req.write(body);
    req.end();
  });
}

async function groqSor(mesajlar, araclar = null) {
  for (const model of MODELLER) {
    const cevap = await tekSor(mesajlar, araclar, model);
    if (cevap) return cevap;
    console.warn(`[groq] ${model} cevap vermedi, bir sonraki modele geciliyor...`);
  }
  console.error('[groq] Tum modeller basarisiz oldu.');
  return null;
}

module.exports = { groqSor };
