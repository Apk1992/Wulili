function buildItems(
  files: GitHubContentItem[],
  type: MemoryKind,
  knownFiles: Record<string, boolean>,
  allFilesDeep: GitHubContentItem[]
): any[] {
  const items: any[] = [];
  
  for (const file of files) {
    if (file.type === 'dir') {
      // 文件夹：检查该文件夹下的所有文件，只要有一个没读过，文件夹就亮 NEW
      const hasNewFile = allFilesDeep.some(f => {
        if (f.type !== 'file') return false;
        // 只要是该文件夹内部的文件（无论是根目录还是子目录）
        if (!f.path.startsWith(file.path)) return false;
        const subId = f.sha || f.path;
        return !knownFiles[f.path] && !knownFiles[subId];
      });

      items.push({
        id: file.sha || file.path,
        kind: type,
        name: file.name,
        displayName: file.name,
        path: file.path,
        size: 0,
        sha: file.sha,
        downloadUrl: '',
        updatedAt: null,
        source: 'repo',
        isFolder: true,
        isNew: hasNewFile,
      });
      continue;
    }
    
    if (file.type === 'file') {
      const kind = detectMemoryKind(file.name);
      if (!kind) continue;
      const uniqueId = file.sha || file.path;
      
      const itemObj = {
        id: uniqueId,
        kind,
        name: file.name,
        displayName: humanizeFileName(file.name),
        path: file.path,
        size: file.size,
        sha: file.sha,
        downloadUrl: file.download_url,
        updatedAt: null,
        source: 'repo',
      };

      // 🔥 核心绝对判定：只要 path 或 uniqueId 不在已读记录里，就是 NEW！
      const isFileNew = !knownFiles[file.path] && !knownFiles[uniqueId];

      items.push({
        ...itemObj,
        isNew: isFileNew,
      });
    }
  }
  
  return items.sort((a, b) => {
    if (a.isFolder && !b.isFolder) return -1;
    if (!a.isFolder && b.isFolder) return 1;
    return a.displayName.localeCompare(b.displayName, 'zh-CN');
  });
}
