import Database from 'better-sqlite3'
import { app } from 'electron'
import { join } from 'path'

const dbPath = join(app.getPath('userData'), 'novels.db')
const db = new Database(dbPath)

// 删除现有表
// db.exec('DROP TABLE IF EXISTS reading_progress')
// db.exec('DROP TABLE IF EXISTS novels')

// 创建小说表
db.exec(`
  CREATE TABLE IF NOT EXISTS novels (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    author TEXT,
    file_path TEXT NOT NULL,
    cover_path TEXT,
    content TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )
`)

// 创建阅读进度表
db.exec(`
  CREATE TABLE IF NOT EXISTS reading_progress (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    novel_id INTEGER NOT NULL,
    chapter_index INTEGER DEFAULT 0,
    scroll_position INTEGER DEFAULT 0,
    last_read_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    sync_status INTEGER DEFAULT 0,
    FOREIGN KEY (novel_id) REFERENCES novels(id)
  )
`)

export const NovelModel = {
  // 添加小说
  addNovel: db.prepare(
    'INSERT INTO novels (title, author, file_path, cover_path, content) VALUES (?, ?, ?, ?, ?)'
  ),

  // 获取所有小说
  getAllNovels: db.prepare('SELECT * FROM novels ORDER BY updated_at DESC'),

  // 获取小说详情
  getNovelById: db.prepare('SELECT * FROM novels WHERE id = ?'),

  // 根据文件路径获取小说
  getNovelByPath: db.prepare('SELECT * FROM novels WHERE file_path = ?'),

  // 更新小说信息
  updateNovel: db.prepare(
    'UPDATE novels SET title = ?, author = ?, content = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?'
  ),

  // 删除小说
  deleteNovel: db.prepare('DELETE FROM novels WHERE id = ?'),

  // 删除小说的阅读进度
  deleteNovelProgress: db.prepare('DELETE FROM reading_progress WHERE novel_id = ?')
}

export const ProgressModel = {
  // 保存阅读进度
  saveProgress: db.prepare(
    'INSERT OR REPLACE INTO reading_progress (novel_id, chapter_index, scroll_position) VALUES (?, ?, ?)'
  ),

  // 获取阅读进度
  getProgress: db.prepare('SELECT * FROM reading_progress WHERE novel_id = ?'),

  // 更新同步状态
  updateSyncStatus: db.prepare('UPDATE reading_progress SET sync_status = ? WHERE id = ?')
}
