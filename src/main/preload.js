const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('api', {
  // Entries
  getEntry: (date) => ipcRenderer.invoke('entry:get', date),
  saveEntry: (data) => ipcRenderer.invoke('entry:save', data),  // { date, logContent, tomorrowsPlan, blockers }
  saveConvertedPlanItems: (data) => ipcRenderer.invoke('entry:saveConvertedPlanItems', data),  // { date, items }
  deleteEntry: (date) => ipcRenderer.invoke('entry:delete', date),
  searchEntries: (query) => ipcRenderer.invoke('entries:search', query),
  searchEntriesAdvanced: (filters) => ipcRenderer.invoke('entries:searchAdvanced', filters),
  getEntryDates: () => ipcRenderer.invoke('entries:dates'),

  // Tasks
  getTasks: (date) => ipcRenderer.invoke('tasks:get', date),
  addTask: (data) => ipcRenderer.invoke('tasks:add', data),
  toggleTask: (id) => ipcRenderer.invoke('tasks:toggle', id),
  deleteTask: (id) => ipcRenderer.invoke('tasks:delete', id),
  updateTaskText: (data) => ipcRenderer.invoke('tasks:updateText', data),
  updateTaskProject: (data) => ipcRenderer.invoke('tasks:updateProject', data),
  reorderTasks: (taskOrders) => ipcRenderer.invoke('tasks:reorder', taskOrders),
  updateTaskStatus: (data) => ipcRenderer.invoke('tasks:updateStatus', data),
  getAllTasks: (filters) => ipcRenderer.invoke('tasks:all', filters),

  // Time tracking
  startTimer: (id) => ipcRenderer.invoke('tasks:startTimer', id),
  stopTimer: (id) => ipcRenderer.invoke('tasks:stopTimer', id),
  setManualTime: (data) => ipcRenderer.invoke('tasks:setManualTime', data),

  // Projects
  getProjects: () => ipcRenderer.invoke('projects:list'),
  addProject: (data) => ipcRenderer.invoke('projects:add', data),
  updateProject: (data) => ipcRenderer.invoke('projects:update', data),
  deleteProject: (id) => ipcRenderer.invoke('projects:delete', id),

  // Holidays
  getHoliday: (date) => ipcRenderer.invoke('holidays:get', date),
  setHoliday: (data) => ipcRenderer.invoke('holidays:set', data),
  removeHoliday: (date) => ipcRenderer.invoke('holidays:remove', date),
  getHolidaysInRange: (data) => ipcRenderer.invoke('holidays:range', data),
  getAllHolidays: () => ipcRenderer.invoke('holidays:all'),
  isNonWorkingDay: (date) => ipcRenderer.invoke('holidays:isNonWorkingDay', date),
  getPreviousWorkingDay: (date) => ipcRenderer.invoke('holidays:previousWorkingDay', date),

  // Tags
  getTags: () => ipcRenderer.invoke('tags:list'),
  addTag: (data) => ipcRenderer.invoke('tags:add', data),
  updateTag: (data) => ipcRenderer.invoke('tags:update', data),
  deleteTag: (id) => ipcRenderer.invoke('tags:delete', id),
  getTagsForEntry: (date) => ipcRenderer.invoke('tags:forEntry', date),
  addTagToEntry: (data) => ipcRenderer.invoke('tags:addToEntry', data),
  removeTagFromEntry: (data) => ipcRenderer.invoke('tags:removeFromEntry', data),

  // Task Templates
  getTaskTemplates: () => ipcRenderer.invoke('templates:list'),
  addTaskTemplate: (data) => ipcRenderer.invoke('templates:add', data),
  deleteTaskTemplate: (id) => ipcRenderer.invoke('templates:delete', id),
  updateTaskTemplate: (data) => ipcRenderer.invoke('templates:update', data),
  applyTemplate: (data) => ipcRenderer.invoke('templates:apply', data),
  applyRecurringTemplates: (date) => ipcRenderer.invoke('templates:applyRecurring', date),

  // Statistics
  getTimePerProject: (data) => ipcRenderer.invoke('stats:timePerProject', data),
  getCompletedPerWeek: (data) => ipcRenderer.invoke('stats:completedPerWeek', data),
  getCompletionRate: (data) => ipcRenderer.invoke('stats:completionRate', data),
  getStreaks: () => ipcRenderer.invoke('stats:streaks'),

  // Workload heatmap
  getWorkloadPerDate: (data) => ipcRenderer.invoke('workload:perDate', data),

  // Backlinks
  getEntriesMentioningDate: (date) => ipcRenderer.invoke('entries:mentioning', date),

  // Carry-over
  getIncompleteTasks: (date) => ipcRenderer.invoke('tasks:incomplete', date),
  carryOverTasks: (data) => ipcRenderer.invoke('tasks:carryOver', data),

  // Settings
  getSetting: (key) => ipcRenderer.invoke('settings:get', key),
  setSetting: (data) => ipcRenderer.invoke('settings:set', data),

  // Export
  exportData: (format) => ipcRenderer.invoke('export:data', format),
  exportMarkdown: (data) => ipcRenderer.invoke('export:markdown', data),
  exportPDF: (data) => ipcRenderer.invoke('export:pdf', data),

  // Attachments
  saveAttachment: (data) => ipcRenderer.invoke('attachments:save', data),
  pickImage: (date) => ipcRenderer.invoke('attachments:pick', date),

  // Reset
  resetAllData: () => ipcRenderer.invoke('data:reset'),

  // Menu events
  onMenuExport: (callback) => {
    const handler = (_event, format) => callback(format);
    ipcRenderer.on('menu:export', handler);
    return () => ipcRenderer.removeListener('menu:export', handler);
  },
  onMenuImportComplete: (callback) => {
    const handler = (_event, result) => callback(result);
    ipcRenderer.on('menu:import-complete', handler);
    return () => ipcRenderer.removeListener('menu:import-complete', handler);
  },

  // Theme
  getSystemTheme: () => ipcRenderer.invoke('theme:system'),
  onThemeChanged: (callback) => {
    const handler = (_event, isDark) => callback(isDark);
    ipcRenderer.on('theme:system-changed', handler);
    return () => ipcRenderer.removeListener('theme:system-changed', handler);
  },

});
