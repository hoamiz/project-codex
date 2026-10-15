export const numberColors: Record<number, string> = {
  1: '#2a62a2',
  2: '#24743f',
  3: '#ad4e13',
  4: '#98529b',
  5: '#af3c66',
  6: '#92652f',
  7: '#006e72',
  8: '#5e58ae',
  9: '#b13d3d',
  10: '#46586f',
};
export const seekObjects = [
  { id: 'fish', name: 'Cá nhỏ', asset: 'fish' },
  { id: 'whale', name: 'Cá voi', asset: 'whale' },
  { id: 'octopus', name: 'Bạch tuộc', asset: 'octopus' },
  { id: 'starfish', name: 'Sao biển', asset: 'starfish' },
  { id: 'crab', name: 'Cua', asset: 'crab' },
  { id: 'camel', name: 'Lạc đà', asset: 'camel' },
  { id: 'fox', name: 'Cáo', asset: 'fox' },
  { id: 'lizard', name: 'Thằn lằn', asset: 'lizard' },
  { id: 'tortoise', name: 'Rùa', asset: 'tortoise' },
  { id: 'snake', name: 'Rắn', asset: 'snake' },
  { id: 'monkey', name: 'Khỉ', asset: 'monkey' },
  { id: 'tiger', name: 'Hổ', asset: 'tiger' },
  { id: 'bird', name: 'Chim', asset: 'bird' },
  { id: 'frog', name: 'Ếch', asset: 'frog' },
  { id: 'trex', name: 'Khủng long bạo chúa', asset: 'trex' },
  { id: 'triceratops', name: 'Khủng long ba sừng', asset: 'triceratops' },
  { id: 'stegosaurus', name: 'Khủng long gai lưng', asset: 'stegosaurus' },
  { id: 'longneck', name: 'Khủng long cổ dài', asset: 'longneck' },
  { id: 'pterodactyl', name: 'Thằn lằn bay', asset: 'pterodactyl' },
  { id: 'car', name: 'Ô tô', asset: 'car' },
  { id: 'bus', name: 'Xe buýt', asset: 'bus' },
  { id: 'train', name: 'Tàu hỏa', asset: 'train' },
  { id: 'plane', name: 'Máy bay', asset: 'plane' },
  { id: 'bicycle', name: 'Xe đạp', asset: 'bicycle' },
] as const;
export type SeekObject = (typeof seekObjects)[number];
export type SeekObjectId = SeekObject['id'];
export const seekThemes = [
  {
    id: 'ocean',
    name: 'Đại dương',
    cover: '#72b9b0',
    objects: ['fish', 'whale', 'octopus', 'starfish', 'crab'],
  },
  {
    id: 'desert',
    name: 'Sa mạc',
    cover: '#d6b176',
    objects: ['camel', 'fox', 'lizard', 'tortoise', 'snake'],
  },
  {
    id: 'jungle',
    name: 'Rừng rậm',
    cover: '#79a46e',
    objects: ['monkey', 'tiger', 'bird', 'frog', 'snake'],
  },
  {
    id: 'dinosaurs',
    name: 'Thế giới khủng long',
    cover: '#91ad73',
    objects: ['trex', 'triceratops', 'stegosaurus', 'longneck', 'pterodactyl'],
  },
  {
    id: 'transport',
    name: 'Phương tiện giao thông',
    cover: '#99b6b1',
    objects: ['car', 'bus', 'train', 'plane', 'bicycle'],
  },
] as const;
export type SeekTheme = (typeof seekThemes)[number];
export type SeekThemeId = SeekTheme['id'];
export type DiscoveryKind = 'number-search' | 'hide-and-seek';
export const discoveryVoiceIds = [
  'number-search',
  'hide-and-seek',
  ...Array.from({ length: 10 }, (_, i) => `number-${i + 1}`),
  ...seekObjects.map((item) => `seek-${item.id}`),
];
export const seekObject = (id: SeekObjectId) => seekObjects.find((item) => item.id === id)!;
