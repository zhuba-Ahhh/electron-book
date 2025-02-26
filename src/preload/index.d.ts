import { ElectronAPI } from '@electron-toolkit/preload'

interface IpcRenderer {
  invoke(
    channel: 'get-progress',
    novelId: number
  ): Promise<{
    scroll_position: number
  } | null>
  invoke(
    channel: 'save-progress',
    novelId: number,
    chapterId: number,
    scrollPosition: number
  ): Promise<void>
  invoke(channel: 'import-novel'): Promise<ImportNovelResult | null>
  invoke(channel: 'get-all-novels'): Promise<Novel[]>
  invoke(channel: 'delete-novel', novelId: number): Promise<void>
  invoke(channel: 'get-novel', novelId: number): Promise<Novel>
  on(channel: 'import-progress', listener: (_event: () => void, progress: number) => void): void
}

declare global {
  interface Window {
    electron: ElectronAPI & {
      ipcRenderer: IpcRenderer
    }
    api: unknown
  }
}
