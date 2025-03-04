/* eslint-disable react-hooks/exhaustive-deps */
import { useEffect, useState, useRef, useMemo } from 'react'
import {
  Box,
  Paper,
  IconButton,
  Typography,
  Pagination,
  Select,
  MenuItem,
  FormControl,
  InputLabel
} from '@mui/material'
import { ArrowBack as ArrowBackIcon } from '@mui/icons-material'
import { ImportNovelResult } from '../types'
import { SelectChangeEvent } from '@mui/material'
import { useReadingProgress } from '@renderer/hooks'

interface ReaderProps {
  novel: ImportNovelResult
  onBack: () => void
}

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

export default function Reader({ novel, onBack }: ReaderProps): JSX.Element | null {
  const [novelData, setNovelData] = useState<NovelData>()
  const [currentChapterIndex, setCurrentChapterIndex] = useState(0)
  const [currentPage, setCurrentPage] = useState(1)
  const contentRef = useRef<HTMLDivElement>(null)

  const { calculateCharsBeforeChapter, calculateCurrentOffset, totalProgress } = useReadingProgress(
    novelData,
    currentChapterIndex,
    currentPage
  )

  // 初始化小说数据
  useEffect(() => {
    try {
      const parsedContent = JSON.parse(novel.content) as NovelData
      setNovelData(parsedContent)
    } catch (error) {
      console.error('解析小说内容失败:', error)
    }
  }, [novel.content])

  // 加载阅读进度
  useEffect(() => {
    if (novelData?.chapters) {
      loadProgress()
    }
  }, [novelData])

  const currentChapter = useMemo((): Chapter => {
    return novelData?.chapters?.[currentChapterIndex] || { index: -1, content: '', title: '' }
  }, [novelData, currentChapterIndex])

  const totalPages = useMemo(
    (): number => Math.ceil((currentChapter.content?.length || 0) / ITEMS_PER_PAGE),
    [currentChapter]
  )

  // 计算当前页的内容
  const currentContent = useMemo((): string[] => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE
    const end = start + ITEMS_PER_PAGE
    const content = currentChapter.content || ''

    let actualEnd = end
    if (actualEnd < content.length) {
      while (actualEnd < content.length && content[actualEnd] !== '\n') {
        actualEnd++
      }
    }

    return content
      .slice(start, actualEnd)
      .split('\n\n')
      .map((paragraph) => paragraph.trim())
      .filter((paragraph) => paragraph.length > 0)
  }, [currentChapter, currentPage])

  const loadProgress = async (): Promise<void> => {
    try {
      const savedProgress = await window.electron.ipcRenderer.invoke('get-progress', novel.id)
      if (savedProgress && novelData?.chapters) {
        let totalOffset = 0
        let targetChapterIndex = 0
        let targetPage = 1

        for (let i = 0; i < novelData.chapters.length; i++) {
          const chapterLength = novelData.chapters[i].content?.length || 0
          if (
            savedProgress.scroll_position >= totalOffset &&
            savedProgress.scroll_position < totalOffset + chapterLength
          ) {
            targetChapterIndex = i
            const relativePosition = savedProgress.scroll_position - totalOffset
            targetPage = Math.floor(relativePosition / ITEMS_PER_PAGE) + 1
            break
          }
          totalOffset += chapterLength
        }

        setCurrentChapterIndex(targetChapterIndex)
        setCurrentPage(targetPage)
      }
    } catch (error) {
      console.error('加载阅读进度失败:', error)
    }
  }

  // 保存阅读进度
  const saveProgress = async (chapterIndex: number, offset: number): Promise<void> => {
    await window.electron.ipcRenderer.invoke('save-progress', novel.id, chapterIndex, offset)
  }

  // 章节切换处理
  const handleChapterChange = async (event: SelectChangeEvent<number>): Promise<void> => {
    const newIndex = event.target.value as number
    setCurrentChapterIndex(newIndex)
    setCurrentPage(1)
    await saveProgress(newIndex, calculateCharsBeforeChapter(newIndex))
  }

  // 翻页处理
  const handlePageChange = async (
    _event: React.ChangeEvent<unknown>,
    page: number
  ): Promise<void> => {
    // 当前页为第1页，点击上一页按钮（page为0）时，跳转到上一章最后一页
    if (page === 0) {
      if (currentChapterIndex > 0) {
        // 上一章最后一页
        const prevChapter = novelData?.chapters[currentChapterIndex - 1]
        const prevChapterPages = Math.ceil((prevChapter?.content?.length || 0) / ITEMS_PER_PAGE)
        setCurrentChapterIndex(currentChapterIndex - 1)
        setCurrentPage(prevChapterPages)
        const offset =
          calculateCharsBeforeChapter(currentChapterIndex - 1) +
          (prevChapterPages - 1) * ITEMS_PER_PAGE
        await saveProgress(currentChapterIndex - 1, offset)
      }
      // 当前页为最后一页，点击下一页按钮（page大于totalPages）时，跳转到下一章第一页
    } else if (page > totalPages) {
      if (currentChapterIndex < (novelData?.chapters?.length || 0) - 1) {
        // 下一章第一页
        setCurrentChapterIndex(currentChapterIndex + 1)
        setCurrentPage(1)
        await saveProgress(
          currentChapterIndex + 1,
          calculateCharsBeforeChapter(currentChapterIndex + 1)
        )
      }
    } else {
      // 当前章节内翻页
      setCurrentPage(page)
      await saveProgress(currentChapterIndex, calculateCurrentOffset())
    }
  }

  // 上一章
  const handlePrevChapter = async (): Promise<void> => {
    if (currentChapterIndex > 0) {
      const newIndex = currentChapterIndex - 1
      setCurrentChapterIndex(newIndex)
      setCurrentPage(1)
      await saveProgress(newIndex, calculateCharsBeforeChapter(newIndex))
    }
  }

  // 下一章
  const handleNextChapter = async (): Promise<void> => {
    if (novelData && currentChapterIndex < novelData.chapters.length - 1) {
      const newIndex = currentChapterIndex + 1
      setCurrentChapterIndex(newIndex)
      setCurrentPage(1)
      await saveProgress(newIndex, calculateCharsBeforeChapter(newIndex))
    }
  }

  if (!novelData) return null

  return (
    <Box sx={{ height: '100vh', display: 'flex', flexDirection: 'column' }}>
      <Box
        sx={{
          p: 2,
          borderBottom: 1,
          borderColor: 'divider',
          display: 'flex',
          alignItems: 'center',
          gap: 2
        }}
      >
        <IconButton onClick={onBack} sx={{ mr: 1 }}>
          <ArrowBackIcon />
        </IconButton>
        <Typography variant="h6" component="span" sx={{ flexGrow: 1 }}>
          {novelData.title}
        </Typography>
        <FormControl size="small" sx={{ minWidth: 200 }}>
          <InputLabel>章节</InputLabel>
          <Select value={currentChapterIndex} label="章节" onChange={handleChapterChange}>
            {novelData.chapters.map((chapter, index) => (
              <MenuItem key={index} value={index}>
                {chapter.title}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
        <Typography variant="body2" color="text.secondary" sx={{ minWidth: 100 }}>
          {currentPage} / {totalPages} 页
        </Typography>
      </Box>
      <Paper
        ref={contentRef}
        sx={{
          flex: 1,
          overflow: 'auto',
          p: 3,
          mx: 'auto',
          maxWidth: 800,
          bgcolor: 'background.paper',
          '& p': {
            mb: 2,
            lineHeight: 1.8,
            textIndent: '2em'
          }
        }}
      >
        <Typography
          variant="h5"
          gutterBottom
          align="center"
          sx={{ mb: 4 }}
          style={{ display: currentPage === 1 ? 'block' : 'none' }}
        >
          {currentChapter.title}
        </Typography>
        {currentContent.map((paragraph, index) => (
          <p key={index}>{paragraph}</p>
        ))}
      </Paper>
      <Box
        sx={{
          py: 2,
          px: 3,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          borderTop: 1,
          borderColor: 'divider',
          bgcolor: 'background.paper'
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Typography variant="body2" color="text.secondary">
            {new Date().toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            总进度: {totalProgress}%
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <IconButton
            onClick={handlePrevChapter}
            disabled={currentChapterIndex === 0}
            size="small"
            sx={{ bgcolor: 'action.hover' }}
          >
            <Typography variant="body2">上一章</Typography>
          </IconButton>
          <Pagination
            count={totalPages}
            page={currentPage}
            onChange={handlePageChange}
            color="primary"
            size="small"
            siblingCount={1}
            boundaryCount={1}
            showFirstButton
            showLastButton
            getItemAriaLabel={(type) => {
              switch (type) {
                case 'first':
                  return '第一页'
                case 'last':
                  return '最后一页'
                case 'next':
                  return '下一页'
                case 'previous':
                  return '上一页'
                default:
                  return `第${type}页`
              }
            }}
          />
          <IconButton
            onClick={handleNextChapter}
            disabled={!novelData || currentChapterIndex === novelData.chapters.length - 1}
            size="small"
            sx={{ bgcolor: 'action.hover' }}
          >
            <Typography variant="body2">下一章</Typography>
          </IconButton>
        </Box>
        <Typography variant="body2" color="text.secondary">
          {currentPage} / {totalPages} 页
        </Typography>
      </Box>
    </Box>
  )
}
