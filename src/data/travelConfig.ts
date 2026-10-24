// src/data/travelConfig.ts

export interface TravelSpot {
  id: string;
  name: string;
  description: string;
  image: string; // 景点照片文件名（放 R2 images/travel/）
}

export interface TravelDestination {
  id: string;
  country: string;
  city: string;
  price: number; // 🔥 价格提高到了 1000 - 5000
  durationHours: number; // 旅游时长（比如 12 或 24 小时）
  description: string; // 旅游特色介绍
  spots: TravelSpot[]; // 包含的景点/纪念照
}

export const TRAVEL_DESTINATIONS: TravelDestination[] = [
  {
    id: 'china_beijing',
    country: '中国',
    city: '北京',
    price: 1000,
    durationHours: 12,
    description: '去故宫看雪，去胡同里吃冰糖葫芦。',
    spots: [
      { id: 'bj_1', name: '故宫', description: '红墙黄瓦，她穿汉服一定很好看。', image: 'images/travel/beijing_palace.png' },
      { id: 'bj_2', name: '长城', description: '不到长城非好汉，但她爬到一半就累了。', image: 'images/travel/beijing_wall.png' },
    ],
  },
  {
    id: 'japan_kyoto',
    country: '日本',
    city: '京都',
    price: 2000,
    durationHours: 18,
    description: '看一场红叶，喝一杯抹茶，听风吹过古寺的声音。',
    spots: [
      { id: 'kyoto_1', name: '清水寺', description: '站在悬空的舞台上，俯瞰整个京都。', image: 'images/travel/kyoto_temple.png' },
      { id: 'kyoto_2', name: '伏见稻荷大社', description: '千本鸟居，像走进了一个红色的梦。', image: 'images/travel/kyoto_shrine.png' },
    ],
  },
  {
    id: 'france_paris',
    country: '法国',
    city: '巴黎',
    price: 3500,
    durationHours: 24,
    description: '浪漫的代名词，适合发呆和拍好看的照片。',
    spots: [
      { id: 'paris_1', name: '埃菲尔铁塔', description: '在塔下吃可颂，看铁塔闪烁的灯光。', image: 'images/travel/paris_eiffel.png' },
      { id: 'paris_2', name: '卢浮宫', description: '艺术品的殿堂，她也许会和蒙娜丽莎对视。', image: 'images/travel/paris_louvre.png' },
    ],
  },
  {
    id: 'iceland_reykjavik',
    country: '冰岛',
    city: '雷克雅未克',
    price: 5000,
    durationHours: 36,
    description: '去世界的尽头，看极光和冰川。',
    spots: [
      { id: 'iceland_1', name: '黑沙滩', description: '黑色的沙子和白色的浪，极致的孤独。', image: 'images/travel/iceland_beach.png' },
      { id: 'iceland_2', name: '极光营地', description: '在漫天的绿色极光下许愿。', image: 'images/travel/iceland_aurora.png' },
    ],
  },
];
