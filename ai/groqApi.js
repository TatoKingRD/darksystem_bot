// ai/groqApi.js
const https = require('https');

async function groqSor(mesajlar, araclar = null) {
  return new Promise((resolve) => {
    const payload = {
      // openai/gpt-oss-120b: OpenAI'nin 120B açık model, tool calling ve talimatlara dikkatte çok iyi
      // Alternatifler: 'openai/gpt-oss-20b' (daha hızlı), 'llama-3.3-70b-versatile' (eski)
      model: 'openai/gpt-oss-120b',
      messages: mesajlar,
      max_tokens: 1024,
      temperature: 0.6,
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
        try { resolve(JSON.parse(data)); }
        catch { resolve(null); }
      });
    });

    req.on('error', () => resolve(null));
    req.setTimeout(15000, () => { req.destroy(); resolve(null); });
    req.write(body);
    req.end();
  });
}

module.exports = { groqSor };
