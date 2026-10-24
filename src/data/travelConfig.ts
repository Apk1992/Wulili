// src/data/travelConfig.ts

export interface TravelSpot {
  id: string;
  name: string;
  description: string;
  image: string; 
}

export interface TravelDestination {
  id: string;
  type: 'nearby' | 'domestic' | 'international'; // 🔥 旅游类型
  country: string;
  city: string;
  price: number; 
  durationHours: number; 
  description: string; 
  spots: TravelSpot[]; 
}

export const TRAVEL_DESTINATIONS: TravelDestination[] = [
  // ============ 周边散心 ============
  {
    id: 'nearby_park',
    type: 'nearby',
    country: '中国',
    city: '附近',
    price: 0, // 免费
    durationHours: 3, // 去半天
    description: '去楼下的公园散步，看看花草，吹吹风。',
    spots: [
      { id: 'park_1', name: '公园长椅', description: '她安静地坐在长椅上发呆。', image: 'images/travel/park_bench.png' },
    ],
  },
  {
    id: 'nearby_riverside',
    type: 'nearby',
    country: '中国',
    city: '附近',
    price: 50, 
    durationHours: 5, 
    description: '买杯奶茶，去江边看日落。',
    spots: [
      { id: 'river_1', name: '江边日落', description: '晚霞把她的脸映得红红的。', image: 'images/travel/riverside_sunset.png' },
    ],
  },
  
  // ============ 国内短途 ============
  {
    id: 'china_beijing',
    type: 'domestic',
    country: '中国',
    city: '北京',
    price: 800,
    durationHours: 12,
    description: '去故宫看雪，去胡同里吃冰糖葫芦。',
    spots: [
      { id: 'bj_1', name: '故宫', description: '红墙黄瓦，她穿汉服一定很好看。', image: 'images/travel/beijing_palace.png' },
      { id: 'bj_2', name: '长城', description: '不到长城非好汉，但她爬到一半就累了。', image: 'images/travel/beijing_wall.png' },
    ],
  },
  {
    id: 'japan_kyoto',
    type: 'domestic',
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

  // ============ 国际长途 ============
  {
    id: 'france_paris',
    type: 'international',
    country: '法国',
    city: '巴黎',
    price: 5000,
    durationHours: 24,
    description: '浪漫的代名词，适合发呆和拍好看的照片。',
    spots: [
      { id: 'paris_1', name: '埃菲尔铁塔', description: '在塔下吃可颂，看铁塔闪烁的灯光。', image: 'images/travel/paris_eiffel.png' },
      { id: 'paris_2', name: '卢浮宫', description: '艺术品的殿堂，她也许会和蒙娜丽莎对视。', image: 'images/travel/paris_louvre.png' },
    ],
  },
  {
    id: 'iceland_reykjavik',
    type: 'international',
    country: '冰岛',
    city: '雷克雅未克',
    price: 12000,
    durationHours: 36,
    description: '去世界的尽头，看极光和冰川。',
    spots: [
      { id: 'iceland_1', name: '黑沙滩', description: '黑色的沙子和白色的浪，极致的孤独。', image: 'images/travel/iceland_beach.png' },
      { id: 'iceland_2', name: '极光营地', description: '在漫天的绿色极光下许愿。', image: 'images/travel/iceland_aurora.png' },
    ],
  },
];

// 🔥 情绪与时间配置
export const HAPPY_BUFF_DAYS = 3; // 旅游回来后，极好心情持续 3 天
export const STRESS_START_DAYS = 30; // 30 天没旅游，开始有压力
export const STRESS_MAX_DAYS = 90; // 90 天没旅游，极度压抑

// 🔥 不同类型旅游带来的压力缓解时间不同
export const TRAVEL_BUFF_CONFIG = {
  nearby: { buffDays: 1 }, // 散步缓解 1 天
  domestic: { buffDays: 3 }, // 国内缓解 3 天
  international: { buffDays: 7 }, // 出国缓解 7 天
};
