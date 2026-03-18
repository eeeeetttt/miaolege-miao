import sharp from 'sharp';
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const publicDir = join(__dirname, '../public');
const iconsDir = join(publicDir, 'icons');

// 确保icons目录存在
if (!existsSync(iconsDir)) {
  mkdirSync(iconsDir, { recursive: true });
}

// 生成图标的尺寸
const sizes = [72, 96, 128, 144, 152, 192, 384, 512];

// 创建一个简单的图标（渐变背景 + 猫emoji）
async function generateIcon(size) {
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${size} ${size}">
      <defs>
        <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" style="stop-color:#7c3aed;stop-opacity:1" />
          <stop offset="100%" style="stop-color:#3b82f6;stop-opacity:1" />
        </linearGradient>
      </defs>
      <rect width="${size}" height="${size}" rx="${size * 0.2}" fill="url(#bg)"/>
      <text x="50%" y="50%" dominant-baseline="central" text-anchor="middle" 
            font-size="${size * 0.55}" font-family="Arial, sans-serif">🐱</text>
    </svg>
  `;

  const buffer = await sharp(Buffer.from(svg))
    .resize(size, size)
    .png()
    .toBuffer();

  return buffer;
}

// 生成快捷方式图标
async function generateShortcutIcon(name, emoji, size = 96) {
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${size} ${size}">
      <defs>
        <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" style="stop-color:#7c3aed;stop-opacity:1" />
          <stop offset="100%" style="stop-color:#3b82f6;stop-opacity:1" />
        </linearGradient>
      </defs>
      <circle cx="${size/2}" cy="${size/2}" r="${size/2}" fill="url(#bg)"/>
      <text x="50%" y="50%" dominant-baseline="central" text-anchor="middle" 
            font-size="${size * 0.5}" font-family="Arial, sans-serif">${emoji}</text>
    </svg>
  `;

  const buffer = await sharp(Buffer.from(svg))
    .resize(size, size)
    .png()
    .toBuffer();

  return buffer;
}

async function main() {
  console.log('🎨 开始生成PWA图标...\n');

  // 生成主图标
  for (const size of sizes) {
    const buffer = await generateIcon(size);
    const filename = `icon-${size}x${size}.png`;
    const filepath = join(iconsDir, filename);
    writeFileSync(filepath, buffer);
    console.log(`✅ 生成: ${filename}`);
  }

  // 生成快捷方式图标
  const shortcuts = [
    { name: 'planet', emoji: '🌍' },
    { name: 'user', emoji: '👤' },
  ];

  for (const shortcut of shortcuts) {
    const buffer = await generateShortcutIcon(shortcut.name, shortcut.emoji);
    const filename = `${shortcut.name}-shortcut.png`;
    const filepath = join(iconsDir, filename);
    writeFileSync(filepath, buffer);
    console.log(`✅ 生成: ${filename}`);
  }

  // 生成favicon
  const faviconBuffer = await generateIcon(32);
  writeFileSync(join(publicDir, 'favicon.ico'), faviconBuffer);
  console.log(`✅ 生成: favicon.ico`);

  console.log('\n🎉 所有图标生成完成！');
}

main().catch(console.error);
