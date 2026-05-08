const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const envPath = path.join(process.cwd(), '.env.local');
const envContent = fs.readFileSync(envPath, 'utf8');
const keyLine = envContent.split('\n').find(line => line.startsWith('FIREBASE_PRIVATE_KEY='));
let rawValue = keyLine.replace('FIREBASE_PRIVATE_KEY=', '').trim();

if (rawValue.startsWith('"') && rawValue.endsWith('"')) {
  rawValue = rawValue.substring(1, rawValue.length - 1);
}

const strategies = {
  "Literal Replace": (k) => k.replace(/\\n/g, '\n'),
  "Ultimate Reconstructor": (k) => {
    const header = "-----BEGIN PRIVATE KEY-----";
    const footer = "-----END PRIVATE KEY-----";
    let raw = k.replace(/\\n/g, "\n").trim();
    const body = raw.replace(header, "").replace(footer, "").replace(/\s+/g, "");
    return `${header}\n${body}\n${footer}`;
  },
  "Raw as-is": (k) => k
};

for (const [name, strategy] of Object.entries(strategies)) {
  const processed = strategy(rawValue);
  try {
    crypto.createPrivateKey(processed);
    console.log(`✅ ${name}: SUCCESS!`);
    fs.writeFileSync('scratch/working_key_format.txt', name);
  } catch (err) {
    console.log(`❌ ${name}: FAILED (${err.message})`);
  }
}
