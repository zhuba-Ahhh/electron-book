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

  const handleSelectNovel = (novel: Novel): void => {
    if (novel) {
      // 将Novel类型转换为ImportNovelResult类型
      const novelResult: ImportNovelResult = {
        id: novel.id,
        title: novel.title,
        content: '' // 这里需要从文件中读取内容，暂时设置为空字符串
      }
      setCurrentNovel(novelResult)
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
