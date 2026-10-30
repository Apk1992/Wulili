// src/components/ActionDialogueModal.tsx
import React from 'react';
import {
  Modal, Pressable, Text, View, TouchableWithoutFeedback,
} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';

export interface ActionDialogueModalProps {
  visible: boolean;
  text: string;
  onClose: () => void;
  iconName?: string;
  /** 主按钮文案；有值才显示主按钮 */
  confirmText?: string;
  /** 取消按钮文案；与 confirmText 同时存在时显示双按钮 */
  cancelText?: string;
  /** 主按钮回调 */
  onConfirm?: () => void;
  /** 取消按钮回调 */
  onCancel?: () => void;
  /** 弹窗标题，可选；不传则不显示标题行 */
  title?: string;
}

export function ActionDialogueModal({
  visible,
  text,
  onClose,
  iconName = 'chatbubble-ellipses',
  confirmText,
  cancelText,
  onConfirm,
  onCancel,
  title,
}: ActionDialogueModalProps): React.JSX.Element {
  const hasConfirm = !!confirmText && typeof onConfirm === 'function';
  const hasCancel = !!cancelText && typeof onCancel === 'function';
  const isDual = hasConfirm && hasCancel;

  const handleBackdrop = () => {
    // 双按钮：点遮罩 = 取消；单按钮/无按钮：= 关闭
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
      onRequestClose={handleCancel}
      statusBarTranslucent
    >
      <TouchableWithoutFeedback onPress={handleBackdrop}>
        <View
          style={{
            flex: 1,
            backgroundColor: 'rgba(0,0,0,0.55)',
            alignItems: 'center',
            justifyContent: 'center',
            paddingHorizontal: 28,
          }}
        >
          <TouchableWithoutFeedback onPress={() => {}}>
            <View
              style={{
                width: '100%',
                maxWidth: 360,
                borderRadius: 20,
                backgroundColor: '#FFFFFF',
                paddingHorizontal: 20,
                paddingTop: 22,
                paddingBottom: 16,
              }}
            >
              {/* 图标 */}
              <View style={{ alignItems: 'center', marginBottom: 10 }}>
                <View
                  style={{
                    width: 56,
                    height: 56,
                    borderRadius: 28,
                    backgroundColor: 'rgba(37,99,235,0.1)',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Ionicons name={iconName as any} size={28} color="#2563EB" />
                </View>
              </View>

              {/* 标题（可选） */}
              {!!title && (
                <Text
                  style={{
                    fontSize: 16,
                    fontWeight: '700',
                    color: '#0F172A',
                    textAlign: 'center',
                    marginBottom: 6,
                  }}
                >
                  {title}
                </Text>
              )}

              {/* 正文 */}
              <Text
                style={{
                  fontSize: 14,
                  lineHeight: 22,
                  color: '#334155',
                  textAlign: 'center',
                  marginBottom: 18,
                }}
              >
                {text}
              </Text>

              {/* 按钮区 */}
              <View style={{ flexDirection: isDual ? 'row' : 'column', gap: 10 }}>
                {isDual && (
                  <Pressable
                    onPress={handleCancel}
                    style={({ pressed }) => ({
                      flex: 1,
                      paddingVertical: 12,
                      borderRadius: 12,
                      backgroundColor: pressed ? '#E2E8F0' : '#F1F5F9',
                      alignItems: 'center',
                    })}
                  >
                    <Text style={{ fontSize: 14, fontWeight: '600', color: '#475569' }}>
                      {cancelText}
                    </Text>
                  </Pressable>
                )}
                <Pressable
                  onPress={handlePrimary}
                  style={({ pressed }) => ({
                    flex: isDual ? 1 : undefined,
                    paddingVertical: 12,
                    borderRadius: 12,
                    backgroundColor: pressed ? '#1D4ED8' : '#2563EB',
                    alignItems: 'center',
                  })}
                >
                  <Text style={{ fontSize: 14, fontWeight: '600', color: '#FFFFFF' }}>
                    {confirmText ?? '好的'}
                  </Text>
                </Pressable>
              </View>
            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
}

export default ActionDialogueModal;
