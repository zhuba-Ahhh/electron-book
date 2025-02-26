/* eslint-disable react-hooks/exhaustive-deps */
import { useMemo } from 'react'

interface Chapter {
  index: number
  title: string
  content: string
}

interface NovelData {
  title: string
  author: string
  chapters: Chapter[]
}

const ITEMS_PER_PAGE = 1000 // 每页显示的字符数

// 自定义hook：计算阅读进度相关的逻辑
const useReadingProgress = (
  novelData: NovelData | undefined,
  currentChapterIndex: number,
  currentPage: number
) => {
  // 计算指定章节之前的总字符数
  const calculateCharsBeforeChapter = (targetIndex: number): number => {
    if (!novelData?.chapters) return 0
    return novelData.chapters.reduce((acc: number, chapter: Chapter, index: number) => {
      if (index < targetIndex) {
        return acc + (chapter.content?.length || 0)
      }
      return acc
    }, 0)
  }

  // 计算当前阅读位置的字符偏移量
  const calculateCurrentOffset = (): number => {
    const charsBeforeCurrentChapter = calculateCharsBeforeChapter(currentChapterIndex)
    const charsInCurrentPage = (currentPage - 1) * ITEMS_PER_PAGE
    return charsBeforeCurrentChapter + charsInCurrentPage
  }

  // 计算总进度
  const totalProgress = useMemo((): number => {
    if (!novelData?.chapters) return 0

    const totalChars = novelData.chapters.reduce(
      (acc: number, chapter: Chapter) => acc + (chapter.content?.length || 0),
      0
    )
    if (totalChars === 0) return 0

    const charsBeforeCurrentChapter = calculateCharsBeforeChapter(currentChapterIndex)
    const charsInCurrentPage = (currentPage - 1) * ITEMS_PER_PAGE
    const currentChapterContent = novelData.chapters[currentChapterIndex]?.content || ''
    const totalReadChars =
      charsBeforeCurrentChapter + Math.min(charsInCurrentPage, currentChapterContent.length)

    return Math.round((totalReadChars / totalChars) * 100)
  }, [novelData, currentChapterIndex, currentPage])

  return {
    calculateCharsBeforeChapter,
    calculateCurrentOffset,
    totalProgress
  }
}

export { useReadingProgress }
