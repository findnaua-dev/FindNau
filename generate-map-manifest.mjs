import fs from 'fs';

const mapFiles = [
  { url: '/Floor_Plan_Ground_Floor.jpg', label: 'Ground Floor' },
  { url: '/Floor_Plan_Second_Floor.jpg', label: 'Second Floor' },
];

fs.writeFileSync('public/maps/list.json', JSON.stringify(mapFiles, null, 2));
console.log('Generated public/maps/list.json');