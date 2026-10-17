import React from 'react';
import { Text, ScrollView } from 'react-native';

export interface NoteRendererProps {
  content: string;
  className?: string;
}

export function NoteRenderer({
  content,
  className = '',
}: NoteRendererProps): React.JSX.Element {
  return (
    <ScrollView
      className={['flex-1 px-4 pt-4', className].filter(Boolean).join(' ')}
      contentContainerClassName="pb-8"
      showsVerticalScrollIndicator={false}
    >
      <Text 
        selectable // 👈 允许长按复制
        className="text-sm leading-7 text-text dark:text-dark-text"
      >
        {content || '（文件内容为空）'}
      </Text>
    </ScrollView>
  );
}

export default NoteRenderer;
