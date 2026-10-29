import React from 'react';
import { View, Text } from 'react-native';
import TrackPlayer from 'react-native-track-player';

// 只测试 TrackPlayer 初始化会不会导致白屏
void (async () => {
  try {
    await TrackPlayer.setupPlayer();
  } catch (e) {
    console.warn('TrackPlayer init fail', e);
  }
})();

export default function App() {
  return (
    <View style={{ flex: 1, backgroundColor: 'red', justifyContent: 'center', alignItems: 'center' }}>
      <Text style={{ color: 'white', fontSize: 30, fontWeight: 'bold' }}>
        TrackPlayer 已加载
      </Text>
    </View>
  );
}
