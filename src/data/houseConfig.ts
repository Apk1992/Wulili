export interface House {
  id: string;
  name: string;
  price: number;
  rentPrice: number;
  image: string;     // 背景图（留空则使用默认季节图）
  description: string;
}

export const HOUSES: House[] = [
  {
    id: 'default_room',
    name: '温馨出租屋',
    price: 0,
    rentPrice: 500,
    image: '', // 空代表用默认的季节背景
    description: '虽然不大，但刚好能装下两个人的生活。',
  },
  {
    id: 'sea_view',
    name: '海景公寓',
    price: 5000,
    rentPrice: 1500,
    image: 'images/scenes/house_sea.png',
    description: '拉开窗帘就是海浪声，她很喜欢坐在飘窗发呆。',
  },
  {
    id: 'penthouse',
    name: '顶层复式',
    price: 20000,
    rentPrice: 5000,
    image: 'images/scenes/house_penthouse.png',
    description: '整座城市的夜景都在脚下，这里是我们永远的家。',
  },
];
