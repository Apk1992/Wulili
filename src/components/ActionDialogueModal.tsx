// src/components/ActionDialogueModal.tsx
import React from 'react';
import { Modal, Pressable, Text, View } from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';

interface Props {
  visible: boolean;
  text: string | null;
  onClose: () => void;
  iconName?: string;
  title?: string;
}

export function ActionDialogueModal({
  visible,
  text,
  onClose,
  iconName = 'heart',
  title = '雾璃',
}: Props): React.JSX.Element {
  return (
    <Modal visible={visible} transparent animationType="fade">
      <Pressable
        onPress={onClose}
        style={{
          flex: 1,
          backgroundColor: 'rgba(0,0,0,0.6)',
          justifyContent: 'center',
          alignItems: 'center',
        }}
      >
        <View
          style={{
            width: '85%',
            backgroundColor: '#1E293B', // 深色背景
            borderRadius: 24,
            padding: 24,
            borderWidth: 1,
            borderColor: '#334155',
          }}
        >
          <View style={{ alignItems: 'center', marginBottom: 16 }}>
            <View
              style={{
                width: 64,
                height: 64,
                borderRadius: 32,
                backgroundColor: 'rgba(37,99,235,0.2)',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: 8,
              }}
            >
              <Ionicons name={iconName as any} size={32} color="#2563EB" />
            </View>
            <Text style={{ fontSize: 18, fontWeight: 'bold', color: '#F8FAFC' }}>
              {title}
            </Text>
          </View>
          <Text
            style={{
              fontSize: 16,
              textAlign: 'center',
              color: '#CBD5E1',
              lineHeight: 24,
              marginBottom: 16,
            }}
          >
            {text}
          </Text>
          <Text style={{ fontSize: 12, textAlign: 'center', color: '#64748B' }}>
            点击任意位置继续...
          </Text>
        </View>
      </Pressable>
    </Modal>
  );
}
