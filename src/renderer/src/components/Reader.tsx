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

interface ReaderProps {
  novel: ImportNovelResult
  onBack: () => void
}

const ITEMS_PER_PAGE = 1000 // 每页显示的字符数

export default function Reader({ novel, onBack }: ReaderProps): JSX.Element | null {
  const [novelData, setNovelData] = useState<{
    title: string
    author: string
    chapters: Array<{ index: number; title: string; content: string }>
  }>()
  const [currentChapterIndex, setCurrentChapterIndex] = useState(0)
  const [currentPage, setCurrentPage] = useState(1)
  const [progress, setProgress] = useState<{ scroll_position: number }>()
  const contentRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    try {
      const parsedContent = JSON.parse(novel.content)
      setNovelData(parsedContent)
    } catch (error) {
      console.error('解析小说内容失败:', error)
    }
  }, [novel.content])

  const currentChapter = useMemo(() => {
    return novelData?.chapters?.[currentChapterIndex] || { content: '', title: '' }
  }, [novelData, currentChapterIndex])

  // 计算当前章节的总页数
  const totalPages = useMemo(
    () => Math.ceil((currentChapter.content?.length || 0) / ITEMS_PER_PAGE),
    [currentChapter]
  )

  // 计算当前页的内容
  const currentContent = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE
    const end = start + ITEMS_PER_PAGE
    return (
      currentChapter.content
        ?.slice(start, end)
        .split('\n\n')
        .map((paragraph) => paragraph.trim())
        .filter((paragraph) => paragraph.length > 0) || []
    )
  }, [currentChapter, currentPage])

  useEffect(() => {
    loadProgress()
  }, [])

  const loadProgress = async (): Promise<void> => {
    try {
      const savedProgress = await window.electron.ipcRenderer.invoke('get-progress', novel.id)
      if (savedProgress) {
        setProgress(savedProgress)
        // 根据保存的滚动位置计算章节和页码
        novelData?.chapters.reduce((acc, chapter, index) => {
          if (savedProgress.scroll_position >= acc) {
            setCurrentChapterIndex(index)
            const chapterStart = acc
            const relativePosition = savedProgress.scroll_position - chapterStart
            const page = Math.floor(relativePosition / ITEMS_PER_PAGE) + 1
            setCurrentPage(Math.min(page, totalPages))
          }
          return acc + (chapter.content?.length || 0)
        }, 0)
      }
    } catch (error) {
      console.error('加载阅读进度失败:', error)
    }
  }

  const handlePageChange = (_event: React.ChangeEvent<unknown>, page: number): void => {
    setCurrentPage(page)
    // 计算总字符偏移量
    const chapterOffset =
      novelData?.chapters.reduce((acc, chapter, index) => {
        if (index < currentChapterIndex) {
          return acc + (chapter.content?.length || 0)
        }
        return acc
      }, 0) || 0
    // 保存阅读进度
    const scrollPosition = chapterOffset + (page - 1) * ITEMS_PER_PAGE
    window.electron.ipcRenderer.invoke(
      'save-progress',
      novel.id,
      currentChapterIndex,
      scrollPosition
    )
  }

  const handleChapterChange = (event: SelectChangeEvent<number>): void => {
    const newIndex = event.target.value as number
    setCurrentChapterIndex(newIndex)
    setCurrentPage(1) // 切换章节时重置页码
  }

  const handlePrevChapter = (): void => {
    if (currentChapterIndex > 0) {
      setCurrentChapterIndex(currentChapterIndex - 1)
      setCurrentPage(1)
      // 保存阅读进度
      const chapterOffset =
        novelData?.chapters.reduce((acc, chapter, index) => {
          if (index < currentChapterIndex - 1) {
            return acc + (chapter.content?.length || 0)
          }
          return acc
        }, 0) || 0
      window.electron.ipcRenderer.invoke(
        'save-progress',
        novel.id,
        currentChapterIndex - 1,
        chapterOffset
      )
    }
  }

  const handleNextChapter = (): void => {
    if (novelData && currentChapterIndex < novelData.chapters.length - 1) {
      setCurrentChapterIndex(currentChapterIndex + 1)
      setCurrentPage(1)
      // 保存阅读进度
      const chapterOffset =
        novelData.chapters.reduce((acc, chapter, index) => {
          if (index < currentChapterIndex + 1) {
            return acc + (chapter.content?.length || 0)
          }
          return acc
        }, 0) || 0
      window.electron.ipcRenderer.invoke(
        'save-progress',
        novel.id,
        currentChapterIndex + 1,
        chapterOffset
      )
    }
  }

  const totalProgress = useMemo(() => {
    if (!novelData?.chapters) return 0

    // 计算总字符数
    const totalChars = novelData.chapters.reduce(
      (acc, chapter) => acc + (chapter.content?.length || 0),
      0
    )
    if (totalChars === 0) return 0

    // 计算已读字符数
    const charsBeforeCurrentChapter = novelData.chapters.reduce((acc, chapter, index) => {
      if (index < currentChapterIndex) {
        return acc + (chapter.content?.length || 0)
      }
      return acc
    }, 0)

    const charsInCurrentPage = (currentPage - 1) * ITEMS_PER_PAGE
    const totalReadChars =
      charsBeforeCurrentChapter + Math.min(charsInCurrentPage, currentChapter.content?.length || 0)

    return Math.round((totalReadChars / totalChars) * 100)
  }, [novelData, currentChapterIndex, currentPage, currentChapter])

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
        <Typography variant="h5" gutterBottom align="center" sx={{ mb: 4 }}>
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
