const { app, BrowserWindow, ipcMain, dialog, Menu, nativeTheme, protocol } = require('electron');
const path = require('path');
const fs = require('fs');
const db = require('./database');

let TurndownService;
try { TurndownService = require('turndown'); } catch { TurndownService = null; }

let mainWindow;

const isDev = !app.isPackaged;

// Register custom protocol as privileged so images can load in the renderer
protocol.registerSchemesAsPrivileged([
  { scheme: 'diary-attach', privileges: { bypassCSP: true, supportFetchAPI: true, stream: true } },
]);

function openHelpWindow() {
  const helpWin = new BrowserWindow({
    width: 640,
    height: 720,
    title: 'Help  - OneLog',
    autoHideMenuBar: true,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
    },
  });
  helpWin.loadFile(path.join(__dirname, 'help.html'));
}

function openArchitectureWindow() {
  const archWin = new BrowserWindow({
    width: 900,
    height: 800,
    title: 'Technical Architecture  - OneLog',
    autoHideMenuBar: true,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
    },
  });
  archWin.loadFile(path.join(__dirname, 'architecture.html'));
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1000,
    height: 700,
    minWidth: 800,
    minHeight: 550,
    title: 'OneLog',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  if (isDev) {
    mainWindow.loadURL('http://localhost:5174');
  } else {
    mainWindow.loadFile(path.join(__dirname, '../../dist/renderer/index.html'));
  }

  mainWindow.webContents.on('did-fail-load', (_e, code, desc) => {
    console.error('Failed to load:', code, desc);
  });

  mainWindow.on('ready-to-show', () => {
    mainWindow.show();
  });
}

app.whenReady().then(() => {
  db.initialize();
  try {
    db.migrateIfNeeded();
    db.runSeedIfNeeded();
    db.capStaleTimers();
  } catch (err) {
    console.error('Startup error (non-fatal):', err);
  }
  registerIpcHandlers();

  const menuTemplate = [
    {
      label: 'File',
      submenu: [
        { role: 'quit' },
      ],
    },
    {
      label: 'Tools',
      submenu: [
        { label: 'Import from JSON...', click: () => handleImport() },
        { type: 'separator' },
        { label: 'Export as JSON', click: () => handleExportFromMenu('json') },
        { label: 'Export as CSV', click: () => handleExportFromMenu('csv') },
        { type: 'separator' },
        { label: 'Export Current Day as Markdown', click: () => mainWindow && mainWindow.webContents.send('menu:export', 'markdown') },
        { label: 'Export Current Day as PDF', click: () => mainWindow && mainWindow.webContents.send('menu:export', 'pdf') },
      ],
    },
    {
      label: 'Edit',
      submenu: [
        { role: 'undo' },
        { role: 'redo' },
        { type: 'separator' },
        { role: 'cut' },
        { role: 'copy' },
        { role: 'paste' },
        { role: 'selectAll' },
      ],
    },
    {
      label: 'View',
      submenu: [
        { role: 'reload' },
        { role: 'forceReload' },
        ...(isDev ? [{ role: 'toggleDevTools' }] : []),
        { type: 'separator' },
        { role: 'resetZoom' },
        { role: 'zoomIn' },
        { role: 'zoomOut' },
        { type: 'separator' },
        { role: 'togglefullscreen' },
      ],
    },
    {
      label: 'Help',
      submenu: [
        {
          label: 'OneLog Help',
          click: () => openHelpWindow(),
        },
        { type: 'separator' },
        {
          label: 'Technical Architecture',
          click: () => openArchitectureWindow(),
        },
      ],
    },
  ];

  const menu = Menu.buildFromTemplate(menuTemplate);
  Menu.setApplicationMenu(menu);

  // Forward system theme changes to renderer
  nativeTheme.on('updated', () => {
    if (mainWindow) {
      mainWindow.webContents.send('theme:system-changed', nativeTheme.shouldUseDarkColors);
    }
  });

  // Custom protocol for serving attachment images
  protocol.handle('diary-attach', (request) => {
    const parsed = new URL(request.url);
    const userDataPath = app.getPath('userData');
    const filePath = path.join(userDataPath, 'attachments', parsed.hostname, parsed.pathname.slice(1));
    if (!fs.existsSync(filePath)) {
      return new Response('Not found', { status: 404 });
    }
    const ext = path.extname(filePath).slice(1).toLowerCase();
    const mimeTypes = { png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg', gif: 'image/gif', webp: 'image/webp' };
    const contentType = mimeTypes[ext] || 'application/octet-stream';
    return new Response(fs.readFileSync(filePath), {
      headers: { 'Content-Type': contentType },
    });
  });

  createWindow();
});

async function handleExportFromMenu(format) {
  if (!mainWindow) return;
  mainWindow.webContents.send('menu:export', format);
}

async function handleImport() {
  if (!mainWindow) return;
  const { filePaths, canceled } = await dialog.showOpenDialog(mainWindow, {
    title: 'Import Daily Diary Data',
    filters: [{ name: 'JSON', extensions: ['json'] }],
    properties: ['openFile'],
  });
  if (canceled || !filePaths.length) return;
  try {
    const raw = fs.readFileSync(filePaths[0], 'utf-8');
    const data = JSON.parse(raw);
    const result = db.importData(data);
    mainWindow.webContents.send('menu:import-complete', result);
  } catch (err) {
    console.error('Import failed:', err);
    mainWindow.webContents.send('menu:import-complete', { success: false, error: err.message });
  }
}

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});

function csvEscape(str) {
  if (!str) return '';
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return '"' + str.replace(/"/g, '""') + '"';
  }
  return str;
}

function registerIpcHandlers() {
  // Entry handlers
  ipcMain.handle('entry:get', (_event, date) => {
    return db.getEntry(date);
  });

  ipcMain.handle('entry:save', (_event, { date, logContent, tomorrowsPlan, blockers }) => {
    return db.saveEntry(date, logContent, tomorrowsPlan, blockers);
  });

  ipcMain.handle('entry:saveConvertedPlanItems', (_event, { date, items }) => {
    return db.saveConvertedPlanItems(date, items);
  });

  ipcMain.handle('entry:delete', (_event, date) => {
    return db.deleteEntry(date);
  });

  // Task handlers
  ipcMain.handle('tasks:get', (_event, date) => {
    return db.getTasks(date);
  });

  ipcMain.handle('tasks:add', (_event, { date, text, projectId }) => {
    return db.addTask(date, text, projectId);
  });

  ipcMain.handle('tasks:toggle', (_event, id) => {
    return db.toggleTask(id);
  });

  ipcMain.handle('tasks:delete', (_event, id) => {
    return db.deleteTask(id);
  });

  ipcMain.handle('tasks:updateText', (_event, { id, text }) => {
    return db.updateTaskText(id, text);
  });

  // Search
  ipcMain.handle('entries:search', (_event, query) => {
    return db.searchEntries(query);
  });

  // Date list for calendar highlights
  ipcMain.handle('entries:dates', () => {
    return db.getEntryDates();
  });

  // Time tracking
  ipcMain.handle('tasks:startTimer', (_event, id) => {
    return db.startTimer(id);
  });

  ipcMain.handle('tasks:stopTimer', (_event, id) => {
    return db.stopTimer(id);
  });

  ipcMain.handle('tasks:setManualTime', (_event, { id, seconds }) => {
    return db.setManualTime(id, seconds);
  });

  // Projects
  ipcMain.handle('projects:list', () => {
    return db.getProjects();
  });

  ipcMain.handle('projects:add', (_event, { name, color }) => {
    return db.addProject(name, color);
  });

  ipcMain.handle('projects:update', (_event, { id, name, color }) => {
    return db.updateProject(id, name, color);
  });

  ipcMain.handle('projects:delete', (_event, id) => {
    return db.deleteProject(id);
  });

  ipcMain.handle('tasks:updateProject', (_event, { id, projectId }) => {
    return db.updateTaskProject(id, projectId);
  });

  // Carry-over
  ipcMain.handle('tasks:incomplete', (_event, date) => {
    return db.getIncompleteTasks(date);
  });

  ipcMain.handle('tasks:carryOver', (_event, { fromDate, toDate }) => {
    return db.carryOverTasks(fromDate, toDate);
  });

  // Settings
  ipcMain.handle('settings:get', (_event, key) => {
    return db.getSetting(key);
  });

  ipcMain.handle('settings:set', (_event, { key, value }) => {
    return db.setSetting(key, value);
  });

  // Export
  ipcMain.handle('export:data', async (_event, format) => {
    const data = db.exportAllData();
    const timestamp = new Date().toISOString().slice(0, 10);

    const filters = format === 'json'
      ? [{ name: 'JSON', extensions: ['json'] }]
      : [{ name: 'CSV', extensions: ['csv'] }];

    const { filePath, canceled } = await dialog.showSaveDialog(mainWindow, {
      title: 'Export Daily Diary Data',
      defaultPath: `daily-diary-export-${timestamp}.${format}`,
      filters,
    });

    if (canceled || !filePath) return { success: false };

    if (format === 'json') {
      fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');
    } else {
      // CSV: one file with entries + tasks combined per row
      const rows = [];
      rows.push(['Date', 'Daily Log', "Tomorrow's Plan", 'Task', 'Completed', 'Project', 'Time Spent (min)'].join(','));

      for (const entry of data.entries) {
        const entryTasks = data.tasks.filter(t => t.entry_date === entry.date);
        if (entryTasks.length === 0) {
          rows.push([
            entry.date,
            csvEscape(entry.log_content),
            csvEscape(entry.tomorrows_plan),
            '', '', '', ''
          ].join(','));
        } else {
          for (const task of entryTasks) {
            rows.push([
              entry.date,
              csvEscape(entry.log_content),
              csvEscape(entry.tomorrows_plan),
              csvEscape(task.text),
              task.completed ? 'Yes' : 'No',
              csvEscape(task.project_name || ''),
              Math.round((task.time_spent || 0) / 60)
            ].join(','));
          }
        }
      }
      fs.writeFileSync(filePath, rows.join('\n'), 'utf-8');
    }

    return { success: true, filePath };
  });

  // Reset all data
  ipcMain.handle('data:reset', () => {
    return db.resetAllData();
  });

  // Theme
  ipcMain.handle('theme:system', () => {
    return nativeTheme.shouldUseDarkColors;
  });

  // Task reordering
  ipcMain.handle('tasks:reorder', (_event, taskOrders) => db.reorderTasks(taskOrders));

  // Task status (Kanban)
  ipcMain.handle('tasks:updateStatus', (_event, { id, status }) => db.updateTaskStatus(id, status));
  ipcMain.handle('tasks:all', (_event, filters) => db.getAllTasks(filters));

  // Holidays
  ipcMain.handle('holidays:get', (_event, date) => db.getHoliday(date));
  ipcMain.handle('holidays:set', (_event, { date, label }) => db.setHoliday(date, label));
  ipcMain.handle('holidays:remove', (_event, date) => db.removeHoliday(date));
  ipcMain.handle('holidays:range', (_event, { startDate, endDate }) => db.getHolidaysInRange(startDate, endDate));
  ipcMain.handle('holidays:all', () => db.getAllHolidays());
  ipcMain.handle('holidays:isNonWorkingDay', (_event, date) => db.isNonWorkingDay(date));
  ipcMain.handle('holidays:previousWorkingDay', (_event, date) => db.getPreviousWorkingDay(date));

  // Tags
  ipcMain.handle('tags:list', () => db.getTags());
  ipcMain.handle('tags:add', (_event, { name, color }) => db.addTag(name, color));
  ipcMain.handle('tags:update', (_event, { id, name, color }) => db.updateTag(id, name, color));
  ipcMain.handle('tags:delete', (_event, id) => db.deleteTag(id));
  ipcMain.handle('tags:forEntry', (_event, date) => db.getTagsForEntry(date));
  ipcMain.handle('tags:addToEntry', (_event, { date, tagId }) => db.addTagToEntry(date, tagId));
  ipcMain.handle('tags:removeFromEntry', (_event, { date, tagId }) => db.removeTagFromEntry(date, tagId));

  // Task Templates
  ipcMain.handle('templates:list', () => db.getTaskTemplates());
  ipcMain.handle('templates:add', (_event, { name, tasks, recurring }) => db.addTaskTemplate(name, tasks, recurring));
  ipcMain.handle('templates:delete', (_event, id) => db.deleteTaskTemplate(id));
  ipcMain.handle('templates:update', (_event, { id, name, tasks, recurring }) => db.updateTaskTemplate(id, name, tasks, recurring));
  ipcMain.handle('templates:apply', (_event, { date, templateId }) => db.applyTemplate(date, templateId));
  ipcMain.handle('templates:applyRecurring', (_event, date) => db.applyRecurringTemplates(date));

  // Statistics
  ipcMain.handle('stats:timePerProject', (_event, { startDate, endDate }) => db.getTimePerProject(startDate, endDate));
  ipcMain.handle('stats:completedPerWeek', (_event, { startDate, endDate }) => db.getTasksCompletedPerWeek(startDate, endDate));
  ipcMain.handle('stats:completionRate', (_event, { startDate, endDate }) => db.getCompletionRate(startDate, endDate));
  ipcMain.handle('stats:streaks', () => db.getStreakData());

  // Workload heatmap
  ipcMain.handle('workload:perDate', (_event, { startDate, endDate }) => db.getWorkloadPerDate(startDate, endDate));

  // Backlinks
  ipcMain.handle('entries:mentioning', (_event, date) => db.getEntriesMentioningDate(date));

  // Advanced search
  ipcMain.handle('entries:searchAdvanced', (_event, filters) => db.searchEntriesAdvanced(filters));

  // Markdown export
  ipcMain.handle('export:markdown', async (_event, { date, logContent, tomorrowsPlan, tasks }) => {
    let md = `# ${date}\n\n## Daily Log\n\n`;
    if (TurndownService) {
      const turndown = new TurndownService();
      md += turndown.turndown(logContent || '') + '\n\n';
    } else {
      md += (logContent || '').replace(/<[^>]*>/g, '') + '\n\n';
    }
    md += '## Tasks\n\n';
    for (const task of (tasks || [])) {
      md += `- [${task.completed ? 'x' : ' '}] ${task.text}`;
      if (task.project_name) md += ` (${task.project_name})`;
      if (task.time_spent > 0) md += ` [${Math.round(task.time_spent / 60)}m]`;
      md += '\n';
    }
    md += '\n## Tomorrow\'s Plan\n\n';
    if (TurndownService) {
      const turndown = new TurndownService();
      md += turndown.turndown(tomorrowsPlan || '') + '\n';
    } else {
      md += (tomorrowsPlan || '').replace(/<[^>]*>/g, '') + '\n';
    }
    const { filePath, canceled } = await dialog.showSaveDialog(mainWindow, {
      title: 'Export as Markdown',
      defaultPath: `diary-${date}.md`,
      filters: [{ name: 'Markdown', extensions: ['md'] }],
    });
    if (canceled || !filePath) return { success: false };
    fs.writeFileSync(filePath, md, 'utf-8');
    return { success: true, filePath };
  });

  // PDF export
  ipcMain.handle('export:pdf', async (_event, { date }) => {
    const { filePath, canceled } = await dialog.showSaveDialog(mainWindow, {
      title: 'Export as PDF',
      defaultPath: `diary-${date}.pdf`,
      filters: [{ name: 'PDF', extensions: ['pdf'] }],
    });
    if (canceled || !filePath) return { success: false };
    const pdfData = await mainWindow.webContents.printToPDF({
      printBackground: true,
      landscape: false,
      pageSize: 'A4',
    });
    fs.writeFileSync(filePath, pdfData);
    return { success: true, filePath };
  });

  // Attachments
  ipcMain.handle('attachments:save', async (_event, { date, dataUrl, filename }) => {
    const userDataPath = app.getPath('userData');
    const attachDir = path.join(userDataPath, 'attachments', date);
    if (!fs.existsSync(attachDir)) fs.mkdirSync(attachDir, { recursive: true });
    const matches = dataUrl.match(/^data:([^;]+);base64,(.+)$/);
    if (!matches) throw new Error('Invalid data URL');
    const ext = matches[1].split('/')[1] || 'png';
    const uniqueName = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
    const filePath = path.join(attachDir, uniqueName);
    fs.writeFileSync(filePath, Buffer.from(matches[2], 'base64'));
    return { success: true, filePath, localUrl: `diary-attach://${date}/${uniqueName}` };
  });

  ipcMain.handle('attachments:pick', async (_event, date) => {
    const { filePaths, canceled } = await dialog.showOpenDialog(mainWindow, {
      title: 'Insert Image',
      filters: [{ name: 'Images', extensions: ['png', 'jpg', 'jpeg', 'gif', 'webp'] }],
      properties: ['openFile'],
    });
    if (canceled || !filePaths.length) return null;
    const srcPath = filePaths[0];
    const originalName = path.basename(srcPath);
    const ext = path.extname(srcPath).slice(1) || 'png';
    const uniqueName = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;

    // Save to attachments folder
    const userDataPath = app.getPath('userData');
    const attachDir = path.join(userDataPath, 'attachments', date || 'unsorted');
    if (!fs.existsSync(attachDir)) fs.mkdirSync(attachDir, { recursive: true });
    const destPath = path.join(attachDir, uniqueName);
    fs.copyFileSync(srcPath, destPath);

    const url = `diary-attach://${date || 'unsorted'}/${uniqueName}`;
    return { url, name: originalName };
  });
}
