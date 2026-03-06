import '@testing-library/jest-dom';

// Mock window.api for all component tests
const mockApi = {
  // Entries
  getEntry: vi.fn().mockResolvedValue(null),
  saveEntry: vi.fn().mockResolvedValue({}),
  searchEntries: vi.fn().mockResolvedValue([]),
  searchEntriesAdvanced: vi.fn().mockResolvedValue({ results: [], total: 0 }),
  getEntryDates: vi.fn().mockResolvedValue([]),

  // Tasks
  getTasks: vi.fn().mockResolvedValue([]),
  addTask: vi.fn().mockResolvedValue({}),
  toggleTask: vi.fn().mockResolvedValue({}),
  deleteTask: vi.fn().mockResolvedValue({ success: true }),
  updateTaskText: vi.fn().mockResolvedValue({}),
  updateTaskProject: vi.fn().mockResolvedValue({}),
  reorderTasks: vi.fn().mockResolvedValue({ success: true }),
  updateTaskStatus: vi.fn().mockResolvedValue({}),
  getAllTasks: vi.fn().mockResolvedValue([]),

  // Time tracking
  startTimer: vi.fn().mockResolvedValue({}),
  stopTimer: vi.fn().mockResolvedValue({}),
  setManualTime: vi.fn().mockResolvedValue({}),

  // Projects
  getProjects: vi.fn().mockResolvedValue([]),
  addProject: vi.fn().mockResolvedValue({}),
  updateProject: vi.fn().mockResolvedValue({}),
  deleteProject: vi.fn().mockResolvedValue({ success: true }),

  // Holidays
  getHoliday: vi.fn().mockResolvedValue(null),
  setHoliday: vi.fn().mockResolvedValue({}),
  removeHoliday: vi.fn().mockResolvedValue({ success: true }),
  getHolidaysInRange: vi.fn().mockResolvedValue([]),
  getAllHolidays: vi.fn().mockResolvedValue([]),
  isNonWorkingDay: vi.fn().mockResolvedValue(false),
  getPreviousWorkingDay: vi.fn().mockImplementation((date: string) => {
    const d = new Date(date + 'T00:00:00');
    d.setDate(d.getDate() - 1);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return Promise.resolve(`${y}-${m}-${day}`);
  }),

  // Tags
  getTags: vi.fn().mockResolvedValue([]),
  addTag: vi.fn().mockResolvedValue({}),
  updateTag: vi.fn().mockResolvedValue({}),
  deleteTag: vi.fn().mockResolvedValue({ success: true }),
  getTagsForEntry: vi.fn().mockResolvedValue([]),
  addTagToEntry: vi.fn().mockResolvedValue({ success: true }),
  removeTagFromEntry: vi.fn().mockResolvedValue({ success: true }),

  // Task Templates
  getTaskTemplates: vi.fn().mockResolvedValue([]),
  addTaskTemplate: vi.fn().mockResolvedValue({}),
  deleteTaskTemplate: vi.fn().mockResolvedValue({ success: true }),
  updateTaskTemplate: vi.fn().mockResolvedValue({}),
  applyTemplate: vi.fn().mockResolvedValue([]),
  applyRecurringTemplates: vi.fn().mockResolvedValue([]),

  // Statistics
  getTimePerProject: vi.fn().mockResolvedValue([]),
  getCompletedPerWeek: vi.fn().mockResolvedValue([]),
  getCompletionRate: vi.fn().mockResolvedValue({ total: 0, completed: 0, rate: 0 }),
  getStreaks: vi.fn().mockResolvedValue({ currentStreak: 0, longestStreak: 0, totalDays: 0 }),

  // Carry-over
  getIncompleteTasks: vi.fn().mockResolvedValue([]),
  carryOverTasks: vi.fn().mockResolvedValue([]),

  // Settings
  getSetting: vi.fn().mockResolvedValue(null),
  setSetting: vi.fn().mockResolvedValue({}),

  // Export
  exportData: vi.fn().mockResolvedValue({ success: true }),
  exportMarkdown: vi.fn().mockResolvedValue({ success: true }),
  exportPDF: vi.fn().mockResolvedValue({ success: true }),

  // Attachments
  saveAttachment: vi.fn().mockResolvedValue({ url: '' }),
  pickImage: vi.fn().mockResolvedValue(null),

  // Reset
  resetAllData: vi.fn().mockResolvedValue({ success: true }),

  // Menu events
  onMenuExport: vi.fn().mockReturnValue(() => {}),
  onMenuImportComplete: vi.fn().mockReturnValue(() => {}),

  // Theme
  getSystemTheme: vi.fn().mockResolvedValue(false),
  onThemeChanged: vi.fn().mockReturnValue(() => {}),
};

Object.defineProperty(window, 'api', { value: mockApi, writable: true });
