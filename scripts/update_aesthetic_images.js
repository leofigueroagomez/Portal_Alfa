const fs = require('fs');
const path = require('path');

// Curated high-resolution aesthetic images by product family and color
const IMAGES = {
  // Hubs / Processors
  PROC3_KIT: 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?auto=format&fit=crop&w=1000&q=85',
  PROC3_CW: 'https://images.unsplash.com/photo-1558002038-1055907df827?auto=format&fit=crop&w=1000&q=85',

  // Dimmers & Switches
  DIMMER_WHITE: 'https://images.unsplash.com/photo-1558002038-1055907df827?auto=format&fit=crop&w=1000&q=85',
  DIMMER_MIDNIGHT: 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=1000&q=85',
  DIMMER_DEEP_SEA: 'https://images.unsplash.com/photo-1507089947368-19c1da9775ae?auto=format&fit=crop&w=1000&q=85',
  DIMMER_PEBBLE: 'https://images.unsplash.com/photo-1600210492486-724fe5c67fb0?auto=format&fit=crop&w=1000&q=85',
  DIMMER_SNOW: 'https://images.unsplash.com/photo-1513506003901-1e6a229e2d15?auto=format&fit=crop&w=1000&q=85',
  DIMMER_TRUFFLE: 'https://images.unsplash.com/photo-1513694203232-719a280e022f?auto=format&fit=crop&w=1000&q=85',

  // Keypads / Botoneras
  KEYPAD_WHITE: 'https://images.unsplash.com/photo-1558002038-1055907df827?auto=format&fit=crop&w=1000&q=85',
  KEYPAD_MIDNIGHT: 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=1000&q=85',
  KEYPAD_PEBBLE: 'https://images.unsplash.com/photo-1600210492486-724fe5c67fb0?auto=format&fit=crop&w=1000&q=85',
  KEYPAD_SNOW: 'https://images.unsplash.com/photo-1513506003901-1e6a229e2d15?auto=format&fit=crop&w=1000&q=85',
  KEYPAD_ALMOND: 'https://images.unsplash.com/photo-1513694203232-719a280e022f?auto=format&fit=crop&w=1000&q=85',

  // Lumaris Linear & Downlights
  LUMARIS_TAPE: 'https://images.unsplash.com/photo-1565814636199-ae8133055c1c?auto=format&fit=crop&w=1000&q=85',
  LUMARIS_KIT: 'https://images.unsplash.com/photo-1618221195710-dd6b41faaea6?auto=format&fit=crop&w=1000&q=85',
  LUMARIS_DOWNLIGHT: 'https://images.unsplash.com/photo-1540518614846-7ede433c4ef0?auto=format&fit=crop&w=1000&q=85',
  LUMARIS_CONTROLLER: 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?auto=format&fit=crop&w=1000&q=85',

  // Fan Controls
  FAN_CONTROL: 'https://images.unsplash.com/photo-1583847268964-b28dc8f51f92?auto=format&fit=crop&w=1000&q=85',

  // Hardware / Connectors
  HARDWARE: 'https://images.unsplash.com/photo-1581092160607-ee22621dd758?auto=format&fit=crop&w=1000&q=85',
};

function getAestheticImage(model, name) {
  const m = (model || '').toUpperCase();
  const n = (name || '').toUpperCase();

  // Processors
  if (m.includes('PROC3KIT')) return IMAGES.PROC3_KIT;
  if (m.includes('PROC3')) return IMAGES.PROC3_CW;

  // Downlights
  if (m.includes('RRLCD')) return IMAGES.LUMARIS_DOWNLIGHT;

  // Lumaris Tape / Kits
  if (m.includes('RRLTLK')) return IMAGES.LUMARIS_KIT;
  if (m.includes('LUT05') || m.includes('LUT30')) return IMAGES.LUMARIS_TAPE;
  if (m.includes('RRLTW') || m.includes('LUPH3')) return IMAGES.LUMARIS_CONTROLLER;
  if (m.includes('LUBP') || m.includes('LUCK') || m.includes('LUMK') || m.includes('LUWK')) return IMAGES.HARDWARE;

  // Fan Controls
  if (m.includes('STANF')) return IMAGES.FAN_CONTROL;

  // Keypads
  if (m.includes('STW') || m.includes('STHN')) {
    if (m.endsWith('MN') || m.endsWith('BL')) return IMAGES.KEYPAD_MIDNIGHT;
    if (m.endsWith('PB')) return IMAGES.KEYPAD_PEBBLE;
    if (m.endsWith('SW')) return IMAGES.KEYPAD_SNOW;
    if (m.endsWith('LA')) return IMAGES.KEYPAD_ALMOND;
    return IMAGES.KEYPAD_WHITE;
  }

  // Dimmers & Switches
  if (m.endsWith('MN') || m.endsWith('BL')) return IMAGES.DIMMER_MIDNIGHT;
  if (m.endsWith('DE')) return IMAGES.DIMMER_DEEP_SEA;
  if (m.endsWith('PB')) return IMAGES.DIMMER_PEBBLE;
  if (m.endsWith('SW')) return IMAGES.DIMMER_SNOW;
  if (m.endsWith('TF') || m.endsWith('TP')) return IMAGES.DIMMER_TRUFFLE;

  return IMAGES.DIMMER_WHITE;
}

// Load and update catalogData.ts
const catalogDataPath = path.join(__dirname, '..', 'lib', 'catalogData.ts');
let catalogContent = fs.readFileSync(catalogDataPath, 'utf8');

// Match and replace image_url
const regex = /"image_url":\s*"([^"]*)"/g;

// Re-generate catalogData.ts cleanly
const generateCatalogScript = require('./generate_catalog_data.js');

console.log('Replacing broken image URLs with curated aesthetic high-end photography...');
