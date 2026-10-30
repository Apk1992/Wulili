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
  /** 主按钮文案；有值才渲染主按钮（单按钮模式也用它） */
  confirmText?: string;
  /** 取消按钮文案；与 confirmText 同时存在 → 双按钮模式 */
  cancelText?: string;
  /** 主按钮回调 */
  onConfirm?: () => void;
  /** 取消按钮回调 */
  onCancel?: () => void;
}

export function ActionDialogueModal({
  visible,
  text,
  onClose,
  iconName = 'heart',
  title = '雾璃',
  confirmText,
  cancelText,
  onConfirm,
  onCancel,
}: Props): React.JSX.Element {
  const hasConfirm = !!confirmText && typeof onConfirm === 'function';
  const hasCancel = !!cancelText && typeof onCancel === 'function';
  const isDual = hasConfirm && hasCancel;

  // 单按钮 = 老行为：点遮罩/按钮都走 onClose
  // 双按钮：点遮罩 = 取消；两个按钮各走各的
  const handleBackdrop = () => {
    if (isDual && onCancel) return onCancel();
    if (hasConfirm && onConfirm) return onConfirm();
    onClose();
  };

  const handlePrimary = () => {
    if (hasConfirm && onConfirm) return onConfirm();
    onClose();
  };

  const handleCancel = () => {
    if (hasCancel && onCancel) return onCancel();
    onClose();
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
      onRequestClose={isDual ? handleCancel : onClose}
    >
      <Pressable
        onPress={handleBackdrop}
        style={{
          flex: 1,
          backgroundColor: 'rgba(0,0,0,0.6)',
          justifyContent: 'center',
          alignItems: 'center',
        }}
      >
        {/* 阻止点击穿透到遮罩 */}
        <Pressable
          onPress={() => {}}
          style={{
            width: '85%',
            backgroundColor: '#1E293B',
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
              marginBottom: isDual ? 20 : 16,
            }}
          >
            {text}
          </Text>

          {isDual ? (
            // ===== 双按钮模式 =====
            <View style={{ flexDirection: 'row', gap: 10 }}>
              <Pressable
                onPress={handleCancel}
                style={({ pressed }) => ({
                  flex: 1,
                  paddingVertical: 12,
                  borderRadius: 14,
                  backgroundColor: pressed ? '#334155' : '#1E293B',
                  borderWidth: 1,
                  borderColor: '#475569',
                  alignItems: 'center',
                })}
              >
                <Text style={{ fontSize: 15, fontWeight: '600', color: '#CBD5E1' }}>
                  {cancelText}
                </Text>
              </Pressable>
              <Pressable
                onPress={handlePrimary}
                style={({ pressed }) => ({
                  flex: 1,
                  paddingVertical: 12,
                  borderRadius: 14,
                  backgroundColor: pressed ? '#1D4ED8' : '#2563EB',
                  alignItems: 'center',
                })}
              >
                <Text style={{ fontSize: 15, fontWeight: '600', color: '#FFFFFF' }}>
                  {confirmText}
                </Text>
              </Pressable>
            </View>
          ) : hasConfirm ? (
            // ===== 单按钮 + 显式 confirmText（罕见，比如"好的"） =====
            <Pressable
              onPress={handlePrimary}
              style={({ pressed }) => ({
                paddingVertical: 12,
                borderRadius: 14,
                backgroundColor: pressed ? '#1D4ED8' : '#2563EB',
                alignItems: 'center',
              })}
            >
              <Text style={{ fontSize: 15, fontWeight: '600', color: '#FFFFFF' }}>
                {confirmText}
              </Text>
            </Pressable>
          ) : (
            // ===== 老行为：仅提示，点任意处继续 =====
            <Text style={{ fontSize: 12, textAlign: 'center', color: '#64748B' }}>
              点击任意位置继续...
            </Text>
          )}
        </Pressable>
      </Pressable>
    </Modal>
  );
}

export default ActionDialogueModal;
