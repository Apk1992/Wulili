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
        selectable
        className="text-sm leading-7 text-text dark:text-dark-text"
      >
        {content || '（由于接口原因，未能读取到文本内容）'}
      </Text>
    </ScrollView>
  );
}

export default NoteRenderer;
