const fs = require('fs');
const path = require('path');
const https = require('https');

const targetDir = path.join(__dirname, '..', 'public', 'products', 'lutron');
if (!fs.existsSync(targetDir)) {
  fs.mkdirSync(targetDir, { recursive: true });
}

const IMAGES_TO_DOWNLOAD = [
  {
    name: 'proc3-kit.jpg',
    url: 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?auto=format&fit=crop&w=800&q=80',
  },
  {
    name: 'proc3-cw.jpg',
    url: 'https://images.unsplash.com/photo-1558002038-1055907df827?auto=format&fit=crop&w=800&q=80',
  },
  {
    name: 'dimmer-white.jpg',
    url: 'https://images.unsplash.com/photo-1558002038-1055907df827?auto=format&fit=crop&w=800&q=80',
  },
  {
    name: 'dimmer-midnight.jpg',
    url: 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=800&q=80',
  },
  {
    name: 'dimmer-deep-sea.jpg',
    url: 'https://images.unsplash.com/photo-1507089947368-19c1da9775ae?auto=format&fit=crop&w=800&q=80',
  },
  {
    name: 'dimmer-pebble.jpg',
    url: 'https://images.unsplash.com/photo-1600210492486-724fe5c67fb0?auto=format&fit=crop&w=800&q=80',
  },
  {
    name: 'dimmer-snow.jpg',
    url: 'https://images.unsplash.com/photo-1513506003901-1e6a229e2d15?auto=format&fit=crop&w=800&q=80',
  },
  {
    name: 'dimmer-truffle.jpg',
    url: 'https://images.unsplash.com/photo-1513694203232-719a280e022f?auto=format&fit=crop&w=800&q=80',
  },
  {
    name: 'keypad-white.jpg',
    url: 'https://images.unsplash.com/photo-1558002038-1055907df827?auto=format&fit=crop&w=800&q=80',
  },
  {
    name: 'keypad-midnight.jpg',
    url: 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=800&q=80',
  },
  {
    name: 'keypad-pebble.jpg',
    url: 'https://images.unsplash.com/photo-1600210492486-724fe5c67fb0?auto=format&fit=crop&w=800&q=80',
  },
  {
    name: 'keypad-snow.jpg',
    url: 'https://images.unsplash.com/photo-1513506003901-1e6a229e2d15?auto=format&fit=crop&w=800&q=80',
  },
  {
    name: 'keypad-almond.jpg',
    url: 'https://images.unsplash.com/photo-1513694203232-719a280e022f?auto=format&fit=crop&w=800&q=80',
  },
  {
    name: 'lumaris-tape.jpg',
    url: 'https://images.unsplash.com/photo-1565814636199-ae8133055c1c?auto=format&fit=crop&w=800&q=80',
  },
  {
    name: 'lumaris-kit.jpg',
    url: 'https://images.unsplash.com/photo-1618221195710-dd6b41faaea6?auto=format&fit=crop&w=800&q=80',
  },
  {
    name: 'lumaris-downlight.jpg',
    url: 'https://images.unsplash.com/photo-1540518614846-7ede433c4ef0?auto=format&fit=crop&w=800&q=80',
  },
  {
    name: 'lumaris-controller.jpg',
    url: 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?auto=format&fit=crop&w=800&q=80',
  },
  {
    name: 'fan-control.jpg',
    url: 'https://images.unsplash.com/photo-1583847268964-b28dc8f51f92?auto=format&fit=crop&w=800&q=80',
  },
  {
    name: 'hardware.jpg',
    url: 'https://images.unsplash.com/photo-1581092160607-ee22621dd758?auto=format&fit=crop&w=800&q=80',
  },
];

async function downloadFile(url, dest) {
  return new Promise((resolve, reject) => {
    https.get(url, (response) => {
      if (response.statusCode >= 300 && response.statusCode < 400 && response.headers.location) {
        return downloadFile(response.headers.location, dest).then(resolve).catch(reject);
      }
      if (response.statusCode !== 200) {
        return reject(new Error(`Failed to download ${url}: status ${response.statusCode}`));
      }
      const fileStream = fs.createWriteStream(dest);
      response.pipe(fileStream);
      fileStream.on('finish', () => {
        fileStream.close();
        resolve();
      });
    }).on('error', (err) => {
      fs.unlink(dest, () => {});
      reject(err);
    });
  });
}

async function run() {
  console.log(`Downloading ${IMAGES_TO_DOWNLOAD.length} images to ${targetDir}...`);
  for (const item of IMAGES_TO_DOWNLOAD) {
    const dest = path.join(targetDir, item.name);
    try {
      await downloadFile(item.url, dest);
      console.log(`✓ Downloaded ${item.name} (${fs.statSync(dest).size} bytes)`);
    } catch (err) {
      console.error(`✗ Error downloading ${item.name}:`, err.message);
    }
  }
  console.log('Finished downloading images.');
}

run();
