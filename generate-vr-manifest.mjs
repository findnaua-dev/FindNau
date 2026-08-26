import fs from 'fs';
import path from 'path';

const folders = [
  'public/VR_Ground_Floor',
  'public/VR_Second_Floor',
];

const scenes = [];
for (const folder of folders) {
  if (!fs.existsSync(folder)) continue;
  const files = fs.readdirSync(folder).filter(file => /\.(jpg|jpeg|png|webp)$/i.test(file));
  for (const file of files) {
    const url = `/${path.basename(folder)}/${file}`;
    const label = file.replace(/\.[^/.]+$/, '');
    scenes.push({ url, label });
  }
}

fs.mkdirSync('public/vr', { recursive: true });
fs.writeFileSync('public/vr/list.json', JSON.stringify(scenes, null, 2));
console.log(`Generated public/vr/list.json with ${scenes.length} scenes.`);