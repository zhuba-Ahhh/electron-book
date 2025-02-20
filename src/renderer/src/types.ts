export interface Novel {
  id: number
  title: string
  author: string
  file_path: string
  cover_path: string
  created_at: string
  updated_at: string
  lastReadTime?: string
  readProgress?: number
}

export interface ReadingProgress {
  id: number
  novel_id: number
  chapter_index: number
  scroll_position: number
  last_read_at: string
  sync_status: number
}

export interface ImportNovelResult {
  id: number
  title: string
  content: string
}

// 扩展 window.electron.ipcRenderer 的类型定义
declare global {
  interface Window {
    electron: {
      ipcRenderer: {
        on(arg0: string, arg1: (_event: () => void, progress: number) => void): unknown
        invoke(channel: 'import-novel'): Promise<ImportNovelResult | null>
        invoke(channel: 'get-all-novels'): Promise<Novel[]>
        invoke(
          channel: 'save-progress',
          novelId: number,
          chapterIndex: number,
          scrollPosition: number
        ): Promise<void>
        invoke(channel: 'get-novel', novelId: number): Promise<Novel>
        invoke(channel: 'get-progress', novelId: number): Promise<ReadingProgress | undefined>
        invoke(channel: 'delete-novel', novelId: number): Promise<void>
      }
    }
  }
}
