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
  message: string | any;
  actions?: EventModalAction[];
  onDismiss?: () => void;
  hideActions?: boolean;
}

export function EventModal({ visible, title, message, actions = [], onDismiss, hideActions = false }: EventModalProps) {
  if (!visible) return null;

  const displayMessage = typeof message === 'string' ? message : (message?.text || message?.message || String(message) || '');

  const content = (
    <View style={{ width: '85%', backgroundColor: '#1E293B', borderRadius: 24, padding: 24, borderWidth: 1, borderColor: '#334155' }}>
      <View style={{ alignItems: 'center', marginBottom: 16 }}>
        <View style={{ width: 64, height: 64, borderRadius: 32, backgroundColor: 'rgba(37,99,235,0.2)', alignItems: 'center', justifyContent: 'center', marginBottom: 8 }}>
          <Ionicons name="heart" size={32} color="#2563EB" />
        </View>
        <Text style={{ fontSize: 18, fontWeight: 'bold', color: '#F8FAFC' }}>{String(title || '提示')}</Text>
      </View>

      <Text style={{ fontSize: 16, textAlign: 'center', color: '#CBD5E1', lineHeight: 24, marginBottom: 24 }}>
        {String(displayMessage)}
      </Text>

      {!hideActions && (
        <View>
          {actions.map((act, idx) => (
            <Pressable
              key={idx}
              onPress={act.onPress}
              style={[
                { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 12, borderRadius: 12, borderWidth: 1, marginBottom: 12 },
                act.primary ? { backgroundColor: '#2563EB', borderColor: '#2563EB' } : { backgroundColor: 'transparent', borderColor: '#334155' }
              ]}
            >
              {act.icon && <Ionicons name={act.icon as any} size={18} color={act.primary ? '#FFFFFF' : '#64748B'} style={{ marginRight: 8 }} />}
              <Text style={[{ fontWeight: '600' }, act.primary ? { color: '#FFFFFF' } : { color: '#CBD5E1' }]}>{act.label}</Text>
            </Pressable>
          ))}
          {onDismiss && (
            <Pressable onPress={onDismiss} style={{ paddingVertical: 8, alignItems: 'center', marginTop: 4 }}>
              <Text style={{ fontSize: 12, color: '#64748B' }}>点击空白处继续...</Text>
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
          <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', alignItems: 'center' }}>{content}</View>
        </TouchableWithoutFeedback>
      ) : (
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', alignItems: 'center' }}>{content}</View>
      )}
    </Modal>
  );
}
