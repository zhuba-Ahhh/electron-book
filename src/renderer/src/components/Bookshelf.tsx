import { useEffect, useState } from 'react'
import {
  Box,
  Grid,
  Card,
  CardContent,
  Typography,
  IconButton,
  TextField,
  MenuItem,
  Select,
  FormControl,
  InputLabel,
  LinearProgress,
  Dialog,
  DialogContent,
  DialogActions,
  DialogTitle,
  Button
} from '@mui/material'
import { Add as AddIcon, Book as BookIcon, Delete as DeleteIcon } from '@mui/icons-material'
import { Novel, ImportNovelResult } from '../types'

interface BookshelfProps {
  onImportSuccess: (novel: ImportNovelResult) => void
  onSelectNovel?: (novel: Novel) => void
}

export default function Bookshelf({ onImportSuccess, onSelectNovel }: BookshelfProps): JSX.Element {
  const [novels, setNovels] = useState<Novel[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [sortBy, setSortBy] = useState('title')
  const [importing, setImporting] = useState(false)
  const [importProgress, setImportProgress] = useState(0)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [novelToDelete, setNovelToDelete] = useState<Novel | null>(null)

  useEffect(() => {
    loadNovels()
    // 监听导入进度更新
    window.electron.ipcRenderer?.on('import-progress', (_event: () => void, progress: number) => {
      setImportProgress(Math.floor(progress))
      if (progress === 100) {
        setTimeout(() => {
          setImporting(false)
          setImportProgress(0)
        }, 800)
      }
    })
  }, [])

  const loadNovels = async (): Promise<void> => {
    try {
      const novelList = await window.electron.ipcRenderer.invoke('get-all-novels')
      // 获取每本小说的阅读进度
      const novelsWithProgress = await Promise.all(
        novelList.map(async (novel) => {
          const progress = await window.electron.ipcRenderer.invoke('get-progress', novel.id)
          if (progress) {
            // 计算当前阅读的章节
            let currentChapter = 0
            let totalOffset = 0
            const content = JSON.parse(novel?.content || '{}')

            for (let i = 0; i < content?.chapters.length; i++) {
              const chapterLength = content?.chapters[i].content?.length || 0
              if (
                progress.scroll_position >= totalOffset &&
                progress.scroll_position < totalOffset + chapterLength
              ) {
                currentChapter = i
                break
              }
              totalOffset += chapterLength
            }

            return {
              ...novel,
              currentChapter: content?.chapters[currentChapter]?.title || '',
              readProgress:
                totalOffset /
                (content.chapters.reduce(
                  (acc, chapter) => acc + (chapter.content?.length || 0),
                  0
                ) || 1)
            }
          }
          return novel
        })
      )
      setNovels(novelsWithProgress)
    } catch (error) {
      console.error('加载小说列表失败:', error)
    }
  }

  const handleImportNovel = async (): Promise<void> => {
    try {
      setImporting(true)
      setImportProgress(0)
      const result = await window.electron.ipcRenderer.invoke('import-novel')
      if (result) {
        await loadNovels()
        onImportSuccess(result)
      }
    } catch (error) {
      console.error('导入小说失败:', error)
    } finally {
      setImporting(false)
      setImportProgress(0)
    }
  }

  const handleNovelClick = async (novel: Novel): Promise<void> => {
    console.log('[32m [ novel ]-79-「components/Bookshelf.tsx」 [0m', novel)
    if (onSelectNovel) {
      try {
        const fullNovel = await window.electron.ipcRenderer.invoke('get-novel', novel.id)
        console.log('[32m [ fullNovel ]-82-「components/Bookshelf.tsx」 [0m', fullNovel)
        onSelectNovel(fullNovel)
      } catch (error) {
        console.error('获取小说内容失败:', error)
      }
    }
  }

  const handleDeleteClick = (event: React.MouseEvent, novel: Novel): void => {
    event.stopPropagation()
    setNovelToDelete(novel)
    setDeleteDialogOpen(true)
  }

  const handleDeleteConfirm = async (): Promise<void> => {
    if (novelToDelete) {
      try {
        await window.electron.ipcRenderer.invoke('delete-novel', novelToDelete.id)
        await loadNovels()
        setDeleteDialogOpen(false)
        setNovelToDelete(null)
      } catch (error) {
        console.error('删除小说失败:', error)
      }
    }
  }

  const filteredAndSortedNovels = novels
    .filter(
      (novel) =>
        novel.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (novel.author && novel.author.toLowerCase().includes(searchQuery.toLowerCase()))
    )
    .sort((a, b) => {
      if (sortBy === 'title') {
        return a.title.localeCompare(b.title)
      } else if (sortBy === 'author') {
        return (a.author || '').localeCompare(b.author || '')
      }
      return 0
    })

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ p: 4, bgcolor: 'background.default' }}>
        <Box sx={{ mb: 4, display: 'flex', gap: 2, alignItems: 'center' }}>
          <TextField
            label="搜索小说"
            variant="outlined"
            size="small"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            sx={{
              flexGrow: 1,
              '& .MuiOutlinedInput-root': {
                borderRadius: 2,
                transition: 'all 0.2s',
                '&:hover': {
                  bgcolor: 'action.hover'
                }
              }
            }}
          />
          <FormControl size="small" sx={{ minWidth: 140 }}>
            <InputLabel>排序方式</InputLabel>
            <Select
              value={sortBy}
              label="排序方式"
              onChange={(e) => setSortBy(e.target.value)}
              sx={{
                borderRadius: 2,
                '&:hover': {
                  bgcolor: 'action.hover'
                }
              }}
            >
              <MenuItem value="title">按标题</MenuItem>
              <MenuItem value="author">按作者</MenuItem>
            </Select>
          </FormControl>
        </Box>

        <Grid container spacing={3}>
          {/* 导入按钮 */}
          <Grid item xs={12} sm={6} md={4} lg={3}>
            <Card
              sx={{
                width: 120,
                height: 240,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                bgcolor: 'background.paper'
              }}
              onClick={handleImportNovel}
            >
              <CardContent sx={{ textAlign: 'center' }}>
                <IconButton
                  size="large"
                  sx={{
                    mb: 2,
                    bgcolor: 'action.hover',
                    '&:hover': {
                      bgcolor: 'action.selected'
                    }
                  }}
                >
                  <AddIcon fontSize="large" />
                </IconButton>
                <Typography variant="h6" gutterBottom>
                  导入
                </Typography>
              </CardContent>
            </Card>
          </Grid>

          {/* 小说列表 */}
          {filteredAndSortedNovels.map((novel) => (
            <Grid key={novel.id} item xs={12} sm={6} md={4} lg={3}>
              <Card
                sx={{
                  width: 120,
                  height: 240,
                  cursor: 'pointer',
                  transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                  position: 'relative',
                  overflow: 'hidden',
                  '&:hover': {
                    transform: 'translateY(-4px)',
                    boxShadow: 4,
                    '& .delete-button': {
                      opacity: 1,
                      transform: 'translateX(0)'
                    }
                  }
                }}
                onClick={() => handleNovelClick(novel)}
              >
                <CardContent sx={{ height: '100%', p: 3 }}>
                  <IconButton
                    className="delete-button"
                    size="small"
                    sx={{
                      position: 'absolute',
                      top: 8,
                      right: 8,
                      color: 'error.main',
                      opacity: 0,
                      transform: 'translateX(10px)',
                      transition: 'all 0.2s',
                      bgcolor: 'error.light',
                      '&:hover': {
                        bgcolor: 'error.dark',
                        color: 'common.white'
                      }
                    }}
                    onClick={(e) => handleDeleteClick(e, novel)}
                  >
                    <DeleteIcon />
                  </IconButton>
                  <Box
                    sx={{
                      display: 'flex',
                      flexDirection: 'column',
                      height: '100%',
                      gap: 2
                    }}
                  >
                    <Box sx={{ textAlign: 'center', mb: 1 }}>
                      <IconButton
                        size="large"
                        sx={{
                          mb: 1,
                          bgcolor: 'action.hover',
                          '&:hover': {
                            bgcolor: 'action.selected'
                          }
                        }}
                      >
                        <BookIcon fontSize="large" />
                      </IconButton>
                      <Typography
                        variant="h6"
                        sx={{
                          fontWeight: 600,
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          display: '-webkit-box',
                          WebkitLineClamp: 2,
                          WebkitBoxOrient: 'vertical',
                          lineHeight: 1.2,
                          minHeight: '2.4em'
                        }}
                      >
                        {novel.title}
                      </Typography>
                    </Box>
                    <Box sx={{ flexGrow: 1 }}>
                      <Typography
                        variant="body2"
                        color="text.secondary"
                        align="center"
                        gutterBottom
                      >
                        {novel.author || '未知作者'}
                      </Typography>
                      {novel.lastReadTime && (
                        <Typography
                          variant="caption"
                          color="text.secondary"
                          align="center"
                          display="block"
                          sx={{ mb: 0.5 }}
                        >
                          上次阅读: {new Date(novel.lastReadTime).toLocaleDateString()}
                        </Typography>
                      )}
                      {novel.readProgress && (
                        <Box sx={{ mt: 'auto', pt: 1 }}>
                          <LinearProgress
                            variant="determinate"
                            value={novel.readProgress * 100}
                            sx={{
                              height: 6,
                              borderRadius: 3,
                              mb: 0.5,
                              bgcolor: 'action.hover',
                              '& .MuiLinearProgress-bar': {
                                borderRadius: 3
                              }
                            }}
                          />
                          <Typography
                            variant="caption"
                            color="text.secondary"
                            align="center"
                            display="block"
                          >
                            阅读进度: {Math.round(novel.readProgress * 100)}%
                          </Typography>
                        </Box>
                      )}
                    </Box>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      </Box>

      {/* 导入进度对话框 */}
      <Dialog
        open={importing}
        disableEscapeKeyDown
        PaperProps={{
          sx: {
            borderRadius: 2,
            boxShadow: 3
          }
        }}
      >
        <DialogContent>
          <Box sx={{ width: 360, p: 3 }}>
            <Typography variant="h6" sx={{ mb: 3 }}>
              正在导入小说...
            </Typography>
            <LinearProgress
              variant="determinate"
              value={importProgress}
              sx={{
                height: 8,
                borderRadius: 4,
                '& .MuiLinearProgress-bar': {
                  borderRadius: 4
                }
              }}
            />
            <Typography
              variant="body2"
              sx={{
                mt: 2,
                textAlign: 'center',
                color: 'text.secondary'
              }}
            >
              {importProgress}%
            </Typography>
          </Box>
        </DialogContent>
      </Dialog>

      {/* 删除确认对话框 */}
      <Dialog
        open={deleteDialogOpen}
        onClose={() => setDeleteDialogOpen(false)}
        aria-labelledby="delete-dialog-title"
        PaperProps={{
          sx: {
            borderRadius: 2,
            boxShadow: 3
          }
        }}
      >
        <DialogTitle
          id="delete-dialog-title"
          sx={{
            pb: 1,
            '& .MuiTypography-root': {
              fontWeight: 600
            }
          }}
        >
          确认删除
        </DialogTitle>
        <DialogContent sx={{ pb: 2, pt: 1 }}>
          <Typography>确定要删除《{novelToDelete?.title}》吗？此操作无法撤销。</Typography>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setDeleteDialogOpen(false)} sx={{ minWidth: 76 }}>
            取消
          </Button>
          <Button
            onClick={handleDeleteConfirm}
            color="error"
            variant="contained"
            autoFocus
            sx={{ minWidth: 76 }}
          >
            删除
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}
