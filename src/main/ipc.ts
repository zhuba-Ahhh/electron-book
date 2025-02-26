import { ipcMain, dialog } from 'electron'
import { readFile } from 'fs/promises'
import { basename } from 'path'
import { NovelModel } from './database/models'
import iconv from 'iconv-lite'
import jschardet from 'jschardet'

interface Chapter {
  index: number
  title: string
  content: string
}

export function setupIPC(): void {
  // 导入小说文件
  ipcMain.handle('import-novel', async (event) => {
    try {
      const result = await dialog.showOpenDialog({
        properties: ['openFile'],
        filters: [{ name: 'Text Files', extensions: ['txt'] }]
      })

      if (!result.canceled && result.filePaths.length > 0) {
        const filePath = result.filePaths[0]
        const buffer = await readFile(filePath)
        const detected = jschardet.detect(buffer)
        const encoding = detected.encoding || 'utf-8'
        const content = iconv.decode(buffer, encoding)

        // 解析小说内容
        const lines = content.split('\n')
        let title = ''
        let author = ''
        const chapters: Chapter[] = []
        let currentChapter: Chapter | null = null
        let chapterContent: string[] = []

        // 提取书名和作者
        for (let i = 0; i < lines.length; i++) {
          const line = lines[i].trim()
          if (line.startsWith('《') && line.endsWith('》')) {
            title = line.slice(1, -1)
            continue
          }
          if (line.startsWith('作者：')) {
            author = line.replace('作者：', '').trim()
            break
          }
        }

        // 如果没有找到书名，使用文件名
        if (!title) {
          title = basename(filePath, '.txt')
        }

        // 解析章节
        const chapterPattern = /^第[一二三四五六七八九十百千万零\d]+[章节卷集][:：]?\s*(.+)$/
        let chapterIndex = 0

        for (let i = 0; i < lines.length; i++) {
          const line = lines[i].trim()
          if (!line) continue

          const chapterMatch = line.match(chapterPattern)
          if (chapterMatch) {
            // 保存上一章节
            if (currentChapter) {
              currentChapter.content = chapterContent.join('\n')
              chapters.push(currentChapter)
              chapterContent = []
            }

            // 创建新章节
            chapterIndex++
            currentChapter = {
              index: chapterIndex,
              title: line,
              content: ''
            }
          } else if (currentChapter) {
            chapterContent.push(line)
          }
        }

        // 保存最后一章
        if (currentChapter && chapterContent.length > 0) {
          currentChapter.content = chapterContent.join('\n')
          chapters.push(currentChapter)
        }

        // 每处理1%的内容就发送一次进度更新
        const totalLength = content.length
        const chunkSize = Math.floor(totalLength / 10)
        let processedLength = 0

        while (processedLength < totalLength) {
          const progress = Math.floor((processedLength / totalLength) * 100)
          event.sender.send('import-progress', progress)
          processedLength += chunkSize
          // 给UI线程一些时间来更新进度
          await new Promise((resolve) => setTimeout(resolve, 10))
        }

        // 将结构化数据存入数据库
        const structuredContent = JSON.stringify({
          title,
          author,
          chapters
        })

        // 检查是否已存在相同文件路径的小说
        const existingNovel = NovelModel.getNovelByPath.get(filePath)
        let novelId: string

        if (existingNovel) {
          // 更新现有小说
          NovelModel.updateNovel.run(title, author, structuredContent, existingNovel.id)
          novelId = existingNovel.id

          // 重置阅读进度
          NovelModel.saveProgress.run(novelId, 0, 0)
        } else {
          // 添加新小说
          const info = NovelModel.addNovel.run(title, author, filePath, '', structuredContent)
          novelId = info.lastInsertRowid
        }

        event.sender.send('import-progress', 100)
        return { id: novelId, title, content: structuredContent }
      }
      return null
    } catch (error) {
      console.error('导入小说失败:', error)
      throw error
    }
  })

  // 获取所有小说
  ipcMain.handle('get-all-novels', () => {
    try {
      return NovelModel.getAllNovels.all()
    } catch (error) {
      console.error('获取小说列表失败:', error)
      throw error
    }
  })

  // 保存阅读进度
  ipcMain.handle(
    'save-progress',
    (_event, novelId: number, chapterIndex: number, scrollPosition: number) => {
      try {
        return NovelModel.saveProgress.run(novelId, chapterIndex, scrollPosition)
      } catch (error) {
        console.error('保存阅读进度失败:', error)
        throw error
      }
    }
  )

  // 获取阅读进度
  ipcMain.handle('get-progress', (_event, novelId: number) => {
    try {
      return NovelModel.getProgress.get(novelId)
    } catch (error) {
      console.error('获取阅读进度失败:', error)
      throw error
    }
  })

  // 删除小说
  ipcMain.handle('delete-novel', (_event, novelId: number) => {
    try {
      // 直接删除小说即可，阅读进度已经包含在小说表中
      NovelModel.deleteNovel.run(novelId)
      return true
    } catch (error) {
      console.error('删除小说失败:', error)
      throw error
    }
  })

  // 获取单本小说的完整信息
  ipcMain.handle('get-novel', async (_event, novelId: number) => {
    try {
      const novel = NovelModel.getNovelById.get(novelId)
      if (!novel) {
        throw new Error('小说不存在')
      }
      return novel
    } catch (error) {
      console.error('获取小说详情失败:', error)
      throw error
    }
  })
}
