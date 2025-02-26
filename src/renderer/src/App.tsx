import { useState } from 'react'
import { CssBaseline, ThemeProvider, createTheme } from '@mui/material'
import Bookshelf from './components/Bookshelf'
import Reader from './components/Reader'
import { ImportNovelResult, Novel } from './types'

const theme = createTheme({
  palette: {
    mode: 'light'
  }
})

function App(): JSX.Element {
  const [currentNovel, setCurrentNovel] = useState<ImportNovelResult | null>(null)

  const handleImportSuccess = (novel: ImportNovelResult): void => {
    setCurrentNovel(novel)
  }

  const handleSelectNovel = async (novel: Novel): Promise<void> => {
    if (novel) {
      try {
        const fullNovel = await window.electron.ipcRenderer.invoke('get-novel', novel.id)
        // 将Novel类型转换为ImportNovelResult类型，并包含完整的小说内容
        const novelResult: ImportNovelResult = {
          id: novel.id,
          title: novel.title,
          content: fullNovel.content // 使用从后端获取的完整小说内容
        }
        setCurrentNovel(novelResult)
      } catch (error) {
        console.error('获取小说内容失败:', error)
      }
    }
  }

  const handleBack = (): void => {
    setCurrentNovel(null)
  }

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      {currentNovel ? (
        <Reader novel={currentNovel} onBack={handleBack} />
      ) : (
        <Bookshelf onImportSuccess={handleImportSuccess} onSelectNovel={handleSelectNovel} />
      )}
    </ThemeProvider>
  )
}

export default App
