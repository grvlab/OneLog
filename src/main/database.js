const Database = require('better-sqlite3');
const path = require('path');
const { app } = require('electron');
const { seedSampleData } = require('./seed');

let db;

// Maximum timer duration in seconds (8 hours).
// Timers left running longer than this (e.g., overnight) get capped.
const MAX_TIMER_SECONDS = 8 * 60 * 60;

function getDbPath() {
  const userDataPath = app.getPath('userData');
  return path.join(userDataPath, 'mydailydiary.db');
}

function formatDateJS(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

const CREATE_TABLES_SQL = `
  CREATE TABLE IF NOT EXISTS entries (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    date TEXT UNIQUE NOT NULL,
    log_content TEXT DEFAULT '',
    tomorrows_plan TEXT DEFAULT '',
    blockers TEXT DEFAULT '',
    converted_plan_items TEXT DEFAULT '[]',
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS tasks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    entry_date TEXT NOT NULL,
    text TEXT NOT NULL,
    completed INTEGER DEFAULT 0,
    position INTEGER DEFAULT 0,
    time_spent INTEGER DEFAULT 0,
    timer_started_at TEXT DEFAULT NULL,
    project_id INTEGER DEFAULT NULL,
    status TEXT DEFAULT 'todo',
    created_at TEXT DEFAULT (datetime('now'))
  );

  CREATE INDEX IF NOT EXISTS idx_tasks_date ON tasks(entry_date);
  CREATE INDEX IF NOT EXISTS idx_entries_date ON entries(date);

  CREATE TABLE IF NOT EXISTS projects (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT UNIQUE NOT NULL,
    color TEXT DEFAULT '#6366f1',
    archived INTEGER DEFAULT 0,
    created_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS settings (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS holidays (
    date TEXT PRIMARY KEY,
    label TEXT NOT NULL DEFAULT 'Holiday'
  );

  CREATE TABLE IF NOT EXISTS tags (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT UNIQUE NOT NULL,
    color TEXT DEFAULT '#6b7280',
    created_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS entry_tags (
    entry_date TEXT NOT NULL,
    tag_id INTEGER NOT NULL,
    PRIMARY KEY (entry_date, tag_id),
    FOREIGN KEY (tag_id) REFERENCES tags(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS task_templates (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    tasks_json TEXT NOT NULL,
    recurring INTEGER DEFAULT 0,
    created_at TEXT DEFAULT (datetime('now'))
  );
`;

function createTables() {
  db.exec(CREATE_TABLES_SQL);
}

function initialize(customDbPath) {
  db = new Database(customDbPath || getDbPath());
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');

  createTables();

  // Migrate: add time columns if they don't exist
  try {
    db.prepare("SELECT time_spent FROM tasks LIMIT 1").get();
  } catch {
    db.exec("ALTER TABLE tasks ADD COLUMN time_spent INTEGER DEFAULT 0");
    db.exec("ALTER TABLE tasks ADD COLUMN timer_started_at TEXT DEFAULT NULL");
  }

  // Migrate: add project_id column to tasks
  try {
    db.prepare("SELECT project_id FROM tasks LIMIT 1").get();
  } catch {
    db.exec("ALTER TABLE tasks ADD COLUMN project_id INTEGER DEFAULT NULL");
  }

  // Migrate: add status column to tasks for Kanban
  try {
    db.prepare("SELECT status FROM tasks LIMIT 1").get();
  } catch {
    db.exec("ALTER TABLE tasks ADD COLUMN status TEXT DEFAULT 'todo'");
    db.exec("UPDATE tasks SET status = 'done' WHERE completed = 1");
    db.exec("UPDATE tasks SET status = 'todo' WHERE completed = 0");
  }

  // Migrate: add blockers column to entries
  try {
    db.prepare("SELECT blockers FROM entries LIMIT 1").get();
  } catch {
    db.exec("ALTER TABLE entries ADD COLUMN blockers TEXT DEFAULT ''");
  }

  // Migrate: add converted_plan_items column to entries
  try {
    db.prepare("SELECT converted_plan_items FROM entries LIMIT 1").get();
  } catch {
    db.exec("ALTER TABLE entries ADD COLUMN converted_plan_items TEXT DEFAULT '[]'");
  }
}

// --- Entries ---

function getEntry(date) {
  const stmt = db.prepare('SELECT * FROM entries WHERE date = ?');
  return stmt.get(date) || null;
}

function saveEntry(date, logContent, tomorrowsPlan, blockers) {
  const stmt = db.prepare(`
    INSERT INTO entries (date, log_content, tomorrows_plan, blockers)
    VALUES (?, ?, ?, ?)
    ON CONFLICT(date) DO UPDATE SET
      log_content = excluded.log_content,
      tomorrows_plan = excluded.tomorrows_plan,
      blockers = excluded.blockers,
      updated_at = datetime('now')
  `);
  stmt.run(date, logContent, tomorrowsPlan, blockers || '');
  return getEntry(date);
}

function saveConvertedPlanItems(date, items) {
  db.prepare(`
    INSERT INTO entries (date, converted_plan_items)
    VALUES (?, ?)
    ON CONFLICT(date) DO UPDATE SET
      converted_plan_items = excluded.converted_plan_items,
      updated_at = datetime('now')
  `).run(date, JSON.stringify(items));
  return { success: true };
}

function deleteEntry(date) {
  db.prepare('DELETE FROM entry_tags WHERE entry_date = ?').run(date);
  db.prepare('DELETE FROM tasks WHERE entry_date = ?').run(date);
  db.prepare('DELETE FROM entries WHERE date = ?').run(date);
  return { success: true };
}

function searchEntries(query) {
  const stmt = db.prepare(`
    SELECT date, log_content, tomorrows_plan FROM entries
    WHERE log_content LIKE ? OR tomorrows_plan LIKE ?
    ORDER BY date DESC
    LIMIT 50
  `);
  const pattern = `%${query}%`;
  return stmt.all(pattern, pattern);
}

function searchEntriesAdvanced({ query, startDate, endDate, projectId, tagId, offset, limit }) {
  let sql = 'SELECT DISTINCT e.date, e.log_content, e.tomorrows_plan FROM entries e';
  const joins = [];
  const conditions = [];
  const params = [];

  if (tagId) {
    joins.push(' JOIN entry_tags et ON et.entry_date = e.date');
    conditions.push('et.tag_id = ?');
    params.push(tagId);
  }
  if (projectId) {
    joins.push(' JOIN tasks t_proj ON t_proj.entry_date = e.date');
    conditions.push('t_proj.project_id = ?');
    params.push(projectId);
  }
  if (query) {
    conditions.push('(e.log_content LIKE ? OR e.tomorrows_plan LIKE ?)');
    const pattern = `%${query}%`;
    params.push(pattern, pattern);
  }
  if (startDate) {
    conditions.push('e.date >= ?');
    params.push(startDate);
  }
  if (endDate) {
    conditions.push('e.date <= ?');
    params.push(endDate);
  }

  sql += joins.join('');
  if (conditions.length > 0) sql += ' WHERE ' + conditions.join(' AND ');
  sql += ' ORDER BY e.date DESC';

  const lim = limit || 50;
  const off = offset || 0;

  // Count query
  const countSql = 'SELECT COUNT(DISTINCT e.date) as total FROM entries e' +
    joins.join('') +
    (conditions.length > 0 ? ' WHERE ' + conditions.join(' AND ') : '');
  const total = db.prepare(countSql).get(...params).total;

  sql += ' LIMIT ? OFFSET ?';
  params.push(lim, off);
  const results = db.prepare(sql).all(...params);

  return { results, total, offset: off, limit: lim };
}

function getEntryDates() {
  const stmt = db.prepare(
    'SELECT date FROM entries UNION SELECT DISTINCT entry_date AS date FROM tasks ORDER BY date DESC'
  );
  return stmt.all().map((row) => row.date);
}

// --- Tasks ---

function getTaskById(id) {
  return db.prepare(
    'SELECT t.*, p.name as project_name, p.color as project_color FROM tasks t LEFT JOIN projects p ON t.project_id = p.id WHERE t.id = ?'
  ).get(id);
}

function getTasks(date) {
  const stmt = db.prepare(
    'SELECT t.*, p.name as project_name, p.color as project_color FROM tasks t LEFT JOIN projects p ON t.project_id = p.id WHERE t.entry_date = ? ORDER BY t.position ASC, t.id ASC'
  );
  return stmt.all(date);
}

function addTask(date, text, projectId) {
  const maxPos = db.prepare(
    'SELECT COALESCE(MAX(position), -1) as max FROM tasks WHERE entry_date = ?'
  ).get(date);
  const stmt = db.prepare(
    'INSERT INTO tasks (entry_date, text, position, project_id) VALUES (?, ?, ?, ?)'
  );
  const pos = (maxPos?.max ?? -1) + 1;
  const result = stmt.run(date, text, pos, projectId || null);
  return getTaskById(result.lastInsertRowid);
}

function toggleTask(id) {
  const task = db.prepare('SELECT * FROM tasks WHERE id = ?').get(id);
  if (!task) return null;
  const newCompleted = task.completed ? 0 : 1;
  const newStatus = newCompleted ? 'done' : 'todo';
  // Auto-stop timer when completing a task
  if (newCompleted && task.timer_started_at) {
    const elapsed = Math.floor((Date.now() - new Date(task.timer_started_at).getTime()) / 1000);
    const capped = Math.min(elapsed, MAX_TIMER_SECONDS);
    const newTimeSpent = (task.time_spent || 0) + capped;
    db.prepare('UPDATE tasks SET completed = ?, status = ?, time_spent = ?, timer_started_at = NULL WHERE id = ?')
      .run(newCompleted, newStatus, newTimeSpent, id);
  } else {
    db.prepare('UPDATE tasks SET completed = ?, status = ? WHERE id = ?').run(newCompleted, newStatus, id);
  }
  return getTaskById(id);
}

function deleteTask(id) {
  db.prepare('DELETE FROM tasks WHERE id = ?').run(id);
  return { success: true };
}

function updateTaskText(id, text) {
  db.prepare('UPDATE tasks SET text = ? WHERE id = ?').run(text, id);
  return getTaskById(id);
}

function updateTaskProject(id, projectId) {
  db.prepare('UPDATE tasks SET project_id = ? WHERE id = ?').run(projectId || null, id);
  return getTaskById(id);
}

function reorderTasks(taskOrders) {
  const stmt = db.prepare('UPDATE tasks SET position = ? WHERE id = ?');
  const tx = db.transaction(() => {
    for (const { id, position } of taskOrders) {
      stmt.run(position, id);
    }
  });
  tx();
  return { success: true };
}

function updateTaskStatus(id, status) {
  const completed = status === 'done' ? 1 : 0;
  // Auto-stop running timer when moving to Done
  if (status === 'done') {
    const task = db.prepare('SELECT * FROM tasks WHERE id = ?').get(id);
    if (task && task.timer_started_at) {
      const elapsed = Math.floor((Date.now() - new Date(task.timer_started_at).getTime()) / 1000);
      const capped = Math.min(elapsed, MAX_TIMER_SECONDS);
      const newTimeSpent = (task.time_spent || 0) + capped;
      db.prepare('UPDATE tasks SET completed = ?, status = ?, time_spent = ?, timer_started_at = NULL WHERE id = ?')
        .run(completed, status, newTimeSpent, id);
      return getTaskById(id);
    }
  }
  db.prepare('UPDATE tasks SET completed = ?, status = ? WHERE id = ?').run(completed, status, id);
  return getTaskById(id);
}

function getAllTasks(filters = {}) {
  let sql = `
    SELECT t.*, p.name as project_name, p.color as project_color
    FROM tasks t LEFT JOIN projects p ON t.project_id = p.id WHERE 1=1`;
  const params = [];

  if (filters.projectId) {
    sql += ' AND t.project_id = ?';
    params.push(filters.projectId);
  }
  if (filters.startDate) {
    sql += ' AND t.entry_date >= ?';
    params.push(filters.startDate);
  }
  if (filters.endDate) {
    sql += ' AND t.entry_date <= ?';
    params.push(filters.endDate);
  }
  sql += ' ORDER BY t.entry_date DESC, t.position ASC';
  if (filters.limit) {
    sql += ' LIMIT ?';
    params.push(filters.limit);
    if (filters.offset) {
      sql += ' OFFSET ?';
      params.push(filters.offset);
    }
  }
  return db.prepare(sql).all(...params);
}

// --- Time Tracking ---

function startTimer(id) {
  const now = new Date().toISOString();
  // Auto-move task to in_progress when timer starts
  db.prepare('UPDATE tasks SET timer_started_at = ?, status = ?, completed = 0 WHERE id = ?')
    .run(now, 'in_progress', id);
  return getTaskById(id);
}

function stopTimer(id) {
  const task = db.prepare('SELECT * FROM tasks WHERE id = ?').get(id);
  if (!task || !task.timer_started_at) return task;
  const elapsed = Math.floor((Date.now() - new Date(task.timer_started_at).getTime()) / 1000);
  const capped = Math.min(elapsed, MAX_TIMER_SECONDS);
  const newTimeSpent = (task.time_spent || 0) + capped;
  db.prepare('UPDATE tasks SET time_spent = ?, timer_started_at = NULL WHERE id = ?').run(newTimeSpent, id);
  return getTaskById(id);
}

function setManualTime(id, seconds) {
  db.prepare('UPDATE tasks SET time_spent = ?, timer_started_at = NULL WHERE id = ?').run(seconds, id);
  return getTaskById(id);
}

// --- Projects ---

function getProjects() {
  return db.prepare('SELECT * FROM projects WHERE archived = 0 ORDER BY name ASC').all();
}

function addProject(name, color) {
  const stmt = db.prepare('INSERT INTO projects (name, color) VALUES (?, ?)');
  const result = stmt.run(name, color || '#6366f1');
  return db.prepare('SELECT * FROM projects WHERE id = ?').get(result.lastInsertRowid);
}

function updateProject(id, name, color) {
  db.prepare('UPDATE projects SET name = ?, color = ? WHERE id = ?').run(name, color, id);
  return db.prepare('SELECT * FROM projects WHERE id = ?').get(id);
}

function deleteProject(id) {
  db.prepare('UPDATE tasks SET project_id = NULL WHERE project_id = ?').run(id);
  db.prepare('DELETE FROM projects WHERE id = ?').run(id);
  return { success: true };
}

// --- Holidays ---

function getHoliday(date) {
  return db.prepare('SELECT * FROM holidays WHERE date = ?').get(date) || null;
}

function setHoliday(date, label) {
  db.prepare('INSERT INTO holidays (date, label) VALUES (?, ?) ON CONFLICT(date) DO UPDATE SET label = excluded.label')
    .run(date, label || 'Holiday');
  return { date, label: label || 'Holiday' };
}

function removeHoliday(date) {
  db.prepare('DELETE FROM holidays WHERE date = ?').run(date);
  return { success: true };
}

function getHolidaysInRange(startDate, endDate) {
  return db.prepare('SELECT * FROM holidays WHERE date >= ? AND date <= ? ORDER BY date ASC').all(startDate, endDate);
}

function getAllHolidays() {
  return db.prepare('SELECT * FROM holidays ORDER BY date ASC').all();
}

function isNonWorkingDay(date) {
  const d = new Date(date + 'T00:00:00');
  const dayOfWeek = d.getDay();
  if (dayOfWeek === 0 || dayOfWeek === 6) return true;
  return !!db.prepare('SELECT 1 FROM holidays WHERE date = ?').get(date);
}

function getPreviousWorkingDay(date) {
  const d = new Date(date + 'T00:00:00');
  for (let i = 0; i < 30; i++) {
    d.setDate(d.getDate() - 1);
    const dateStr = formatDateJS(d);
    if (!isNonWorkingDay(dateStr)) return dateStr;
  }
  // Fallback: just return previous calendar day
  const fallback = new Date(date + 'T00:00:00');
  fallback.setDate(fallback.getDate() - 1);
  return formatDateJS(fallback);
}

// --- Tags ---

function getTags() {
  return db.prepare('SELECT * FROM tags ORDER BY name ASC').all();
}

function addTag(name, color) {
  const result = db.prepare('INSERT INTO tags (name, color) VALUES (?, ?)').run(name, color || '#6b7280');
  return db.prepare('SELECT * FROM tags WHERE id = ?').get(result.lastInsertRowid);
}

function updateTag(id, name, color) {
  db.prepare('UPDATE tags SET name = ?, color = ? WHERE id = ?').run(name, color, id);
  return db.prepare('SELECT * FROM tags WHERE id = ?').get(id);
}

function deleteTag(id) {
  db.prepare('DELETE FROM entry_tags WHERE tag_id = ?').run(id);
  db.prepare('DELETE FROM tags WHERE id = ?').run(id);
  return { success: true };
}

function getTagsForEntry(date) {
  return db.prepare(
    'SELECT t.* FROM tags t JOIN entry_tags et ON et.tag_id = t.id WHERE et.entry_date = ? ORDER BY t.name ASC'
  ).all(date);
}

function addTagToEntry(date, tagId) {
  db.prepare('INSERT OR IGNORE INTO entry_tags (entry_date, tag_id) VALUES (?, ?)').run(date, tagId);
  return { success: true };
}

function removeTagFromEntry(date, tagId) {
  db.prepare('DELETE FROM entry_tags WHERE entry_date = ? AND tag_id = ?').run(date, tagId);
  return { success: true };
}

// --- Task Templates ---

function getTaskTemplates() {
  return db.prepare('SELECT * FROM task_templates ORDER BY name ASC').all();
}

function addTaskTemplate(name, tasksJson, recurring) {
  const result = db.prepare('INSERT INTO task_templates (name, tasks_json, recurring) VALUES (?, ?, ?)')
    .run(name, JSON.stringify(tasksJson), recurring ? 1 : 0);
  return db.prepare('SELECT * FROM task_templates WHERE id = ?').get(result.lastInsertRowid);
}

function deleteTaskTemplate(id) {
  db.prepare('DELETE FROM task_templates WHERE id = ?').run(id);
  return { success: true };
}

function updateTaskTemplate(id, name, tasksJson, recurring) {
  db.prepare('UPDATE task_templates SET name = ?, tasks_json = ?, recurring = ? WHERE id = ?')
    .run(name, JSON.stringify(tasksJson), recurring ? 1 : 0, id);
  return db.prepare('SELECT * FROM task_templates WHERE id = ?').get(id);
}

function applyTemplate(date, templateId) {
  const template = db.prepare('SELECT * FROM task_templates WHERE id = ?').get(templateId);
  if (!template) return [];
  const taskDefs = JSON.parse(template.tasks_json);
  const created = [];
  for (const def of taskDefs) {
    created.push(addTask(date, def.text, def.projectId || null));
  }
  return created;
}

function applyRecurringTemplates(date) {
  const existing = getTasks(date);
  if (existing.length > 0) return [];
  const recurring = db.prepare('SELECT * FROM task_templates WHERE recurring = 1').all();
  const all = [];
  for (const template of recurring) {
    const taskDefs = JSON.parse(template.tasks_json);
    for (const def of taskDefs) {
      all.push(addTask(date, def.text, def.projectId || null));
    }
  }
  return all;
}

// --- Statistics ---

function getTimePerProject(startDate, endDate) {
  let sql = `
    SELECT p.name as project_name, p.color as project_color, SUM(t.time_spent) as total_time
    FROM tasks t JOIN projects p ON t.project_id = p.id`;
  const params = [];
  const conds = [];
  if (startDate) { conds.push('t.entry_date >= ?'); params.push(startDate); }
  if (endDate) { conds.push('t.entry_date <= ?'); params.push(endDate); }
  if (conds.length) sql += ' WHERE ' + conds.join(' AND ');
  sql += ' GROUP BY p.id ORDER BY total_time DESC';
  return db.prepare(sql).all(...params);
}

function getTasksCompletedPerWeek(startDate, endDate) {
  let sql = `
    SELECT strftime('%Y-W%W', entry_date) as week,
    MIN(entry_date) as week_start,
    COUNT(*) as completed
    FROM tasks WHERE completed = 1`;
  const params = [];
  if (startDate) { sql += ' AND entry_date >= ?'; params.push(startDate); }
  if (endDate) { sql += ' AND entry_date <= ?'; params.push(endDate); }
  sql += ' GROUP BY week ORDER BY week ASC';
  return db.prepare(sql).all(...params);
}

function getCompletionRate(startDate, endDate) {
  let sql = 'SELECT COUNT(*) as total, SUM(CASE WHEN completed = 1 THEN 1 ELSE 0 END) as completed FROM tasks';
  const params = [];
  const conds = [];
  if (startDate) { conds.push('entry_date >= ?'); params.push(startDate); }
  if (endDate) { conds.push('entry_date <= ?'); params.push(endDate); }
  if (conds.length) sql += ' WHERE ' + conds.join(' AND ');
  const row = db.prepare(sql).get(...params);
  row.rate = row.total > 0 ? row.completed / row.total : 0;
  return row;
}

function getStreakData() {
  const dates = db.prepare(
    'SELECT DISTINCT entry_date FROM tasks WHERE completed = 1 OR time_spent > 0 ORDER BY entry_date DESC'
  ).all().map(r => r.entry_date);

  if (dates.length === 0) return { currentStreak: 0, longestStreak: 0, totalActiveDays: 0 };

  // Check if two dates are consecutive working days (skipping weekends/holidays)
  function areConsecutiveWorkingDays(laterDate, earlierDate) {
    const d = new Date(laterDate + 'T00:00:00');
    d.setDate(d.getDate() - 1);
    while (isNonWorkingDay(formatDateJS(d))) {
      d.setDate(d.getDate() - 1);
    }
    return formatDateJS(d) === earlierDate;
  }

  let longestStreak = 1;
  let tempStreak = 1;

  for (let i = 1; i < dates.length; i++) {
    if (areConsecutiveWorkingDays(dates[i - 1], dates[i])) {
      tempStreak++;
      longestStreak = Math.max(longestStreak, tempStreak);
    } else {
      tempStreak = 1;
    }
  }

  // Current streak: count back from today, skipping non-working days
  const today = formatDateJS(new Date());
  let currentStreak = 0;
  const dateSet = new Set(dates);
  const d = new Date(today + 'T00:00:00');
  let checkedFirst = false;
  for (let i = 0; i < 365; i++) {
    const dateStr = formatDateJS(d);
    if (isNonWorkingDay(dateStr)) {
      d.setDate(d.getDate() - 1);
      continue;
    }
    if (dateSet.has(dateStr)) {
      currentStreak++;
      checkedFirst = true;
    } else if (checkedFirst) {
      break;
    } else {
      checkedFirst = true;
    }
    d.setDate(d.getDate() - 1);
  }

  return { currentStreak, longestStreak, totalDays: dates.length };
}

// --- Workload Heatmap ---

function getWorkloadPerDate(startDate, endDate) {
  return db.prepare(`
    SELECT
      entry_date as date,
      COUNT(*) as task_count,
      SUM(CASE WHEN completed = 1 THEN 1 ELSE 0 END) as completed_count,
      SUM(COALESCE(time_spent, 0)) as total_time
    FROM tasks
    WHERE entry_date >= ? AND entry_date <= ?
    GROUP BY entry_date
  `).all(startDate, endDate);
}

// --- Backlinks ---

function getEntriesMentioningDate(date) {
  const pattern = `%data-date="${date}"%`;
  return db.prepare(`
    SELECT date, log_content, tomorrows_plan
    FROM entries
    WHERE (log_content LIKE ? OR tomorrows_plan LIKE ?)
      AND date != ?
    ORDER BY date DESC
    LIMIT 50
  `).all(pattern, pattern, date);
}

// --- Carry Over ---

function getIncompleteTasks(date) {
  return db.prepare(
    'SELECT t.*, p.name as project_name, p.color as project_color FROM tasks t LEFT JOIN projects p ON t.project_id = p.id WHERE t.entry_date = ? AND t.completed = 0 ORDER BY t.position ASC'
  ).all(date);
}

function carryOverTasks(fromDate, toDate) {
  const incomplete = getIncompleteTasks(fromDate);
  const carried = [];
  for (const task of incomplete) {
    const newTask = addTask(toDate, task.text, task.project_id);
    carried.push(newTask);
  }
  return carried;
}

// --- Settings ---

function getSetting(key) {
  const row = db.prepare('SELECT value FROM settings WHERE key = ?').get(key);
  return row ? row.value : null;
}

function setSetting(key, value) {
  db.prepare('INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value').run(key, value);
  return { key, value };
}

// --- Export ---

function exportAllData() {
  const entries = db.prepare('SELECT * FROM entries ORDER BY date DESC').all();
  const tasks = db.prepare(
    'SELECT t.*, p.name as project_name, p.color as project_color FROM tasks t LEFT JOIN projects p ON t.project_id = p.id ORDER BY t.entry_date DESC, t.position ASC'
  ).all();
  const projects = db.prepare('SELECT * FROM projects ORDER BY name ASC').all();
  const holidays = db.prepare('SELECT * FROM holidays ORDER BY date ASC').all();
  const tags = db.prepare('SELECT * FROM tags ORDER BY name ASC').all();
  const entryTags = db.prepare('SELECT * FROM entry_tags').all();
  const taskTemplates = db.prepare('SELECT * FROM task_templates ORDER BY name ASC').all();
  return { entries, tasks, projects, holidays, tags, entryTags, taskTemplates };
}

// --- Import ---

function importData(data) {
  if (!data || typeof data !== 'object') throw new Error('Invalid data format');

  const insertEntry = db.prepare(
    'INSERT OR REPLACE INTO entries (date, log_content, tomorrows_plan, blockers, converted_plan_items) VALUES (?, ?, ?, ?, ?)'
  );
  const insertProject = db.prepare(
    'INSERT OR IGNORE INTO projects (name, color) VALUES (?, ?)'
  );
  const insertTask = db.prepare(
    'INSERT INTO tasks (entry_date, text, completed, position, project_id, time_spent, timer_started_at, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
  );
  const findProject = db.prepare('SELECT id FROM projects WHERE name = ?');
  const findTag = db.prepare('SELECT id FROM tags WHERE name = ?');

  const tx = db.transaction(() => {
    let entriesCount = 0;
    let tasksCount = 0;
    let projectsCount = 0;

    // Import projects first
    if (Array.isArray(data.projects)) {
      for (const p of data.projects) {
        if (p.name) {
          insertProject.run(p.name, p.color || '#6B7280');
          projectsCount++;
        }
      }
    }

    // Import entries
    if (Array.isArray(data.entries)) {
      for (const e of data.entries) {
        if (e.date) {
          insertEntry.run(e.date, e.log_content || '', e.tomorrows_plan || '', e.blockers || '', e.converted_plan_items || '[]');
          entriesCount++;
        }
      }
    }

    // Import tasks
    if (Array.isArray(data.tasks)) {
      for (const t of data.tasks) {
        if (t.entry_date && t.text) {
          let projectId = null;
          if (t.project_name) {
            const row = findProject.get(t.project_name);
            if (row) projectId = row.id;
          } else if (t.project_id) {
            projectId = t.project_id;
          }
          const completed = t.completed ? 1 : 0;
          const status = t.status || (completed ? 'done' : 'todo');
          insertTask.run(
            t.entry_date, t.text,
            completed,
            t.position || 0,
            projectId,
            t.time_spent || 0,
            t.timer_started_at || null,
            status
          );
          tasksCount++;
        }
      }
    }

    // Import holidays
    if (Array.isArray(data.holidays)) {
      const insertHoliday = db.prepare('INSERT OR REPLACE INTO holidays (date, label) VALUES (?, ?)');
      for (const h of data.holidays) {
        if (h.date) insertHoliday.run(h.date, h.label || 'Holiday');
      }
    }

    // Import tags and build old-id → new-id map
    const tagIdMap = new Map();
    if (Array.isArray(data.tags)) {
      const insertTag = db.prepare('INSERT OR IGNORE INTO tags (name, color) VALUES (?, ?)');
      for (const t of data.tags) {
        if (t.name) {
          insertTag.run(t.name, t.color || '#6b7280');
          const row = findTag.get(t.name);
          if (row && t.id) tagIdMap.set(t.id, row.id);
        }
      }
    }

    // Import entry_tags with remapped tag IDs
    if (Array.isArray(data.entryTags)) {
      const insertEntryTag = db.prepare('INSERT OR IGNORE INTO entry_tags (entry_date, tag_id) VALUES (?, ?)');
      for (const et of data.entryTags) {
        const newTagId = tagIdMap.get(et.tag_id);
        if (et.entry_date && newTagId) insertEntryTag.run(et.entry_date, newTagId);
      }
    }

    // Import task templates
    if (Array.isArray(data.taskTemplates)) {
      const insertTemplate = db.prepare('INSERT OR IGNORE INTO task_templates (name, tasks_json, recurring) VALUES (?, ?, ?)');
      for (const tt of data.taskTemplates) {
        if (tt.name) insertTemplate.run(tt.name, tt.tasks_json || '[]', tt.recurring ? 1 : 0);
      }
    }

    return { success: true, entriesCount, tasksCount, projectsCount };
  });

  return tx();
}

// --- Reset ---

function resetAllData() {
  db.exec('DELETE FROM entry_tags');
  db.exec('DELETE FROM tasks');
  db.exec('DELETE FROM entries');
  db.exec('DELETE FROM projects');
  db.exec('DELETE FROM holidays');
  db.exec('DELETE FROM tags');
  db.exec('DELETE FROM task_templates');
  db.exec('DELETE FROM settings');
  // Mark onboarding as complete so seed data isn't re-inserted on next launch
  setSetting('onboarding_complete', 'true');
  // Preserve app_version so migrateIfNeeded doesn't wipe again on next startup
  setSetting('app_version', APP_VERSION);
  return { success: true };
}

// --- Migration ---

const APP_VERSION = require('../../package.json').version;
const MIN_CLEAN_VERSION = '1.0.5';

function compareVersions(a, b) {
  const pa = a.split('.').map(Number);
  const pb = b.split('.').map(Number);
  for (let i = 0; i < 3; i++) {
    if ((pa[i] || 0) < (pb[i] || 0)) return -1;
    if ((pa[i] || 0) > (pb[i] || 0)) return 1;
  }
  return 0;
}

function migrateIfNeeded() {
  const storedVersion = getSetting('app_version');
  if (!storedVersion || compareVersions(storedVersion, MIN_CLEAN_VERSION) < 0) {
    // Drop all tables and recreate with current schema to handle upgrades
    // from old versions that may have incompatible table definitions
    db.pragma('foreign_keys = OFF');
    db.exec('DROP TABLE IF EXISTS entry_tags');
    db.exec('DROP TABLE IF EXISTS task_templates');
    db.exec('DROP TABLE IF EXISTS holidays');
    db.exec('DROP TABLE IF EXISTS tags');
    db.exec('DROP TABLE IF EXISTS tasks');
    db.exec('DROP TABLE IF EXISTS entries');
    db.exec('DROP TABLE IF EXISTS projects');
    db.exec('DROP TABLE IF EXISTS settings');
    db.pragma('foreign_keys = ON');

    // Recreate all tables with current schema
    createTables();
  }
  setSetting('app_version', APP_VERSION);
}

// --- Seed ---

function runSeedIfNeeded() {
  const seeded = getSetting('onboarding_complete');
  if (!seeded) {
    seedSampleData(db);
    setSetting('onboarding_complete', 'pending_tour');
    return true;
  }
  return false;
}

// --- Stale Timer Cleanup ---
// Called on startup to cap timers left running overnight or longer than MAX_TIMER_SECONDS
function capStaleTimers() {
  const stale = db.prepare('SELECT * FROM tasks WHERE timer_started_at IS NOT NULL').all();
  for (const task of stale) {
    const elapsed = Math.floor((Date.now() - new Date(task.timer_started_at).getTime()) / 1000);
    if (elapsed > MAX_TIMER_SECONDS) {
      const newTimeSpent = (task.time_spent || 0) + MAX_TIMER_SECONDS;
      db.prepare('UPDATE tasks SET time_spent = ?, timer_started_at = NULL WHERE id = ?')
        .run(newTimeSpent, task.id);
    }
  }
}

module.exports = {
  initialize,
  getEntry,
  saveEntry,
  saveConvertedPlanItems,
  deleteEntry,
  searchEntries,
  searchEntriesAdvanced,
  getEntryDates,
  getTasks,
  addTask,
  toggleTask,
  deleteTask,
  updateTaskText,
  updateTaskProject,
  reorderTasks,
  updateTaskStatus,
  getAllTasks,
  startTimer,
  stopTimer,
  setManualTime,
  getProjects,
  addProject,
  updateProject,
  deleteProject,
  // Holidays
  getHoliday,
  setHoliday,
  removeHoliday,
  getHolidaysInRange,
  getAllHolidays,
  isNonWorkingDay,
  getPreviousWorkingDay,
  // Tags
  getTags,
  addTag,
  updateTag,
  deleteTag,
  getTagsForEntry,
  addTagToEntry,
  removeTagFromEntry,
  // Task Templates
  getTaskTemplates,
  addTaskTemplate,
  deleteTaskTemplate,
  updateTaskTemplate,
  applyTemplate,
  applyRecurringTemplates,
  // Statistics
  getTimePerProject,
  getTasksCompletedPerWeek,
  getCompletionRate,
  getStreakData,
  getWorkloadPerDate,
  getEntriesMentioningDate,
  // Carry Over
  getIncompleteTasks,
  carryOverTasks,
  getSetting,
  setSetting,
  exportAllData,
  importData,
  resetAllData,
  migrateIfNeeded,
  runSeedIfNeeded,
  capStaleTimers,
};
