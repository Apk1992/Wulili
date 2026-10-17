import React from 'react';
import { View, Text, ScrollView } from 'react-native';
import { useTheme } from '@/hooks/useTheme';

export interface NoteRendererProps {
  content: string;
  className?: string;
}

interface NoteBlock {
  kind: 'heading' | 'paragraph' | 'bullet' | 'divider' | 'quote';
  level?: number;
  text: string;
}

export function NoteRenderer({
  content,
  className = '',
}: NoteRendererProps): React.JSX.Element {
  const { isDark } = useTheme();

  // 🔥 自动检测：如果没有 Markdown 的特征符号（# > - *），且换行较多，就判定为 TXT
  const hasMarkdownSigns = /^(#{1,3}\s|>\s|[-*+]\s|---)/m.test(content);
  const isTxt = !hasMarkdownSigns;

  if (isTxt) {
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
          {content}
        </Text>
      </ScrollView>
    );
  }

  const blocks = parseMarkdown(content);

  return (
    <ScrollView
      className={['flex-1 px-4 pt-4', className].filter(Boolean).join(' ')}
      contentContainerClassName="pb-8"
      showsVerticalScrollIndicator={false}
    >
      {blocks.map((block, index) => (
        <NoteBlockView key={`block-${index}`} block={block} isDark={isDark} />
      ))}
    </ScrollView>
  );
}

// 下面的 NoteBlockView 和 parseMarkdown 保持原样，不用动，我直接给你补全：
function NoteBlockView({ block, isDark }: { block: NoteBlock; isDark: boolean }): React.JSX.Element {
  switch (block.kind) {
    case 'heading':
      return (
        <Text className={['mt-4 mb-2 font-bold text-text dark:text-dark-text', block.level === 1 ? 'text-2xl' : block.level === 2 ? 'text-xl' : 'text-lg'].join(' ')}>
          {block.text}
        </Text>
      );
    case 'bullet':
      return (
        <View className="flex-row mb-1">
          <Text className="text-text dark:text-dark-text mr-2">•</Text>
          <Text className="flex-1 text-sm leading-6 text-text dark:text-dark-text">{block.text}</Text>
        </View>
      );
    case 'divider':
      return <View className="h-px my-3 bg-border dark:bg-dark-border" />;
    case 'quote':
      return (
        <View className="border-l-4 border-primary pl-3 my-2">
          <Text className="text-sm italic text-muted dark:text-dark-muted">{block.text}</Text>
        </View>
      );
    case 'paragraph':
    default:
      return (
        <Text className="mb-2 text-sm leading-6 text-text dark:text-dark-text">{block.text}</Text>
      );
  }
}

function parseMarkdown(content: string): NoteBlock[] {
  const lines = content.replace(/\r\n/g, '\n').split('\n');
  const blocks: NoteBlock[] = [];
  let paragraphBuffer: string[] = [];

  const flushParagraph = () => {
    if (paragraphBuffer.length > 0) {
      const text = paragraphBuffer.join(' ').trim();
      if (text.length > 0) blocks.push({ kind: 'paragraph', text });
      paragraphBuffer = [];
    }
  };

  for (const rawLine of lines) {
    const line = rawLine.trimEnd();
    const trimmed = line.trim();
    if (trimmed.length === 0) { flushParagraph(); continue; }
    const headingMatch = trimmed.match(/^(#{1,3})\s+(.*)$/);
    if (headingMatch) { flushParagraph(); blocks.push({ kind: 'heading', level: headingMatch[1].length, text: headingMatch[2] }); continue; }
    if (trimmed === '---' || trimmed === '***') { flushParagraph(); blocks.push({ kind: 'divider', text: '' }); continue; }
    if (trimmed.startsWith('> ')) { flushParagraph(); blocks.push({ kind: 'quote', text: trimmed.slice(2) }); continue; }
    const bulletMatch = trimmed.match(/^[-*+]\s+(.*)$/);
    if (bulletMatch) { flushParagraph(); blocks.push({ kind: 'bullet', text: bulletMatch[1] }); continue; }
    paragraphBuffer.push(trimmed);
  }
  flushParagraph();
  return blocks;
}

export default NoteRenderer;
