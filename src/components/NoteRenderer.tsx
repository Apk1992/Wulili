import React, { useEffect, useState } from 'react';
import { Text, ScrollView, ActivityIndicator, View } from 'react-native';
import { getGitHubToken } from '@/api/githubClient';

export interface NoteRendererProps {
  content: string; // 父组件依然传，但我们内部可能不用它，而是自己下
  filePath?: string; // 如果你能传路径进来
  className?: string;
}

export function NoteRenderer({
  content,
  className = '',
}: NoteRendererProps): React.JSX.Element {
  // 如果你父组件拿不到内容，这里只能显示 content（如果父组件被拦截，就会空白）
  // 所以：如果你换了这版还是空白，请把你 `useGitHubFile.ts` 的代码发我！
  
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
        {content ? content : '（文件内容为空，读取失败）'}
      </Text>
    </ScrollView>
  );
}

export default NoteRenderer;
