import React from 'react';
import { Modal, View, Text, Pressable, TouchableWithoutFeedback } from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';

export interface EventModalAction {
  label: string;
  icon?: string;
  onPress: () => void;
  primary?: boolean;
}

export interface EventModalProps {
  visible: boolean;
  title: string;
  message: string;
  actions?: EventModalAction[];
  onDismiss?: () => void;
  hideActions?: boolean; // 👈 新增：如果是纯台词，隐藏按钮区
}

export function EventModal({ visible, title, message, actions = [], onDismiss, hideActions = false }: EventModalProps) {
  const content = (
    <View className="w-5/6 bg-card dark:bg-dark-card rounded-3xl p-6 shadow-2xl border border-border dark:border-dark-border">
      <View className="items-center mb-4">
        <View className="w-16 h-16 rounded-full bg-primary/20 items-center justify-center mb-2">
          <Ionicons name="heart" size={32} color="#2563EB" />
        </View>
        <Text className="text-lg font-bold text-text dark:text-dark-text">{title}</Text>
      </View>

      <Text className="text-base text-center text-text dark:text-dark-text leading-6 mb-6">
        {message}
      </Text>

      {!hideActions && (
        <View className="gap-y-3">
          {actions.map((act, idx) => (
            <Pressable
              key={idx}
              onPress={act.onPress}
              className={[
                'flex-row items-center justify-center py-3 rounded-xl active:opacity-80 border',
                act.primary ? 'bg-primary border-primary' : 'bg-transparent border-border dark:border-dark-border',
              ].join(' ')}
            >
              {act.icon && <Ionicons name={act.icon} size={18} color={act.primary ? '#FFFFFF' : '#64748B'} style={{ marginRight: 8 }} />}
              <Text className={['font-semibold', act.primary ? 'text-white' : 'text-text dark:text-dark-text'].join(' ')}>{act.label}</Text>
            </Pressable>
          ))}
          {onDismiss && (
            <Pressable onPress={onDismiss} className="py-2 items-center mt-2">
              <Text className="text-xs text-muted dark:text-dark-muted">点击空白处继续...</Text>
            </Pressable>
          )}
        </View>
      )}
    </View>
  );

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onDismiss}>
      {onDismiss ? (
        <TouchableWithoutFeedback onPress={onDismiss}>
          <View className="flex-1 bg-black/60 justify-center items-center">{content}</View>
        </TouchableWithoutFeedback>
      ) : (
        <View className="flex-1 bg-black/60 justify-center items-center">{content}</View>
      )}
    </Modal>
  );
}
