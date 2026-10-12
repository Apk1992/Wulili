export interface StreamConfigData {
  baseEarningPerSecond: number;
  energyCostPerSecond: number;
  moodCostPerSecond: number;
  autoStopEnergy: number;
  autoStopHealth: number;
  maxOfflineSeconds: number;
  minEnergyToStart: number;
  minHealthToStart: number;
}

export const STREAM_CONFIG: StreamConfigData = {
  // 满状态下一小时赚 60 金币
  baseEarningPerSecond: 60 / 3600,
  // 满精力可支撑约 8 小时
  energyCostPerSecond: 12 / 3600,
  // 8 小时心情降约 48
  moodCostPerSecond: 6 / 3600,
  // 精力低于 5 自动结束
  autoStopEnergy: 5,
  // 健康低于 10 自动结束
  autoStopHealth: 10,
  // 离线最多补 8 小时收益
  maxOfflineSeconds: 8 * 60 * 60,
  // 开播门槛
  minEnergyToStart: 10,
  minHealthToStart: 15,
};