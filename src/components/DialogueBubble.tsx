import React, { useEffect, useRef } from 'react';
import { Animated, Easing, Pressable, Text, View } from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import type { Dialogue, EmotionTag } from '@/types/dialogue';
import { EMOTION_LABELS } from '@/types/dialogue';

export interface DialogueBubbleProps {
  dialogue: Dialogue | null;
  onDismiss?: () => void;
  autoDismissMs?: number;
  className?: string;
}

export function DialogueBubble({
  dialogue,
  onDismiss,
  autoDismissMs = 8000,
  className = '',
}: DialogueBubbleProps): React.JSX.Element | null {
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(8)).current;
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!dialogue) {
      opacity.setValue(0);
      translateY.setValue(8);
      return;
    }

    Animated.parallel([
      Animated.timing(opacity, {
        toValue: 1,
        duration: 260,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(translateY, {
        toValue: 0,
        duration: 260,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
    ]).start();

    if (timerRef.current !== null) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }

    if (autoDismissMs > 0) {
      timerRef.current = setTimeout(() => {
        Animated.timing(opacity, {
          toValue: 0,
          duration: 240,
          useNativeDriver: true,
        }).start(() => {
          if (onDismiss) onDismiss();
        });
      }, autoDismissMs);
    }

    return () => {
      if (timerRef.current !== null) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [dialogue, autoDismissMs, onDismiss, opacity, translateY]);

  if (!dialogue) return null;

  const { borderColor, bgColor, textColor, iconColor, iconName } = emotionStyle(
    dialogue.emotion,
  );

  return (
    <Animated.View
      style={{ opacity, transform: [{ translateY }] }}
      className={['w-full', className].filter(Boolean).join(' ')}
      pointerEvents="box-none"
    >
      <Pressable onPress={onDismiss} className="w-full active:opacity-90">
        <View
          className="rounded-2xl p-3 border"
          style={{ backgroundColor: bgColor, borderColor }}
        >
          <View className="flex-row items-center mb-1">
            <Ionicons name={iconName} size={14} color={iconColor} />
            <Text
              className="ml-1.5 text-[10px] font-semibold"
              style={{ color: textColor }}
            >
              雾璃 · {EMOTION_LABELS[dialogue.emotion]}
            </Text>
          </View>
          <Text
            className="text-sm leading-6"
            style={{ color: textColor }}
          >
            {dialogue.text}
          </Text>
        </View>
      </Pressable>
    </Animated.View>
  );
}

function emotionStyle(emotion: EmotionTag): {
  borderColor: string;
  bgColor: string;
  textColor: string;
  iconColor: string;
  iconName: string;
} {
  switch (emotion) {
    case 'warm':
      return {
        borderColor: '#FCA5A5',
        bgColor: '#FEF2F2',
        textColor: '#991B1B',
        iconColor: '#DC2626',
        iconName: 'heart',
      };
    case 'conflicted':
      return {
        borderColor: '#FCD34D',
        bgColor: '#FFFBEB',
        textColor: '#92400E',
        iconColor: '#D97706',
        iconName: 'help-circle',
      };
    case 'selfBlame':
      return {
        borderColor: '#C4B5FD',
        bgColor: '#F5F3FF',
        textColor: '#5B21B6',
        iconColor: '#7C3AED',
        iconName: 'rainy',
      };
    case 'fragile':
      return {
        borderColor: '#A5B4FC',
        bgColor: '#EEF2FF',
        textColor: '#3730A3',
        iconColor: '#4F46E5',
        iconName: 'heart-dislike',
      };
    case 'philosophical':
      return {
        borderColor: '#93C5FD',
        bgColor: '#EFF6FF',
        textColor: '#1E40AF',
        iconColor: '#2563EB',
        iconName: 'moon',
      };
    case 'playful':
      return {
        borderColor: '#FBCFE8',
        bgColor: '#FDF2F8',
        textColor: '#9D174D',
        iconColor: '#DB2777',
        iconName: 'sparkles',
      };
    case 'longing':
      return {
        borderColor: '#C7D2FE',
        bgColor: '#EEF2FF',
        textColor: '#3730A3',
        iconColor: '#6366F1',
        iconName: 'cloud',
      };
    case 'calm':
    default:
      return {
        borderColor: '#CBD5E1',
        bgColor: '#F8FAFC',
        textColor: '#0F172A',
        iconColor: '#64748B',
        iconName: 'chatbubble-ellipses',
      };
  }
}

export default DialogueBubble;