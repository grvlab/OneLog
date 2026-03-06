export interface Entry {
  id: number;
  date: string;
  log_content: string;
  tomorrows_plan: string;
  blockers: string;
  converted_plan_items: string;
  created_at: string;
  updated_at: string;
}

export interface Task {
  id: number;
  entry_date: string;
  text: string;
  completed: number;
  position: number;
  time_spent: number;
  timer_started_at: string | null;
  project_id: number | null;
  project_name: string | null;
  project_color: string | null;
  status: 'todo' | 'in_progress' | 'done';
  created_at: string;
}

export interface Project {
  id: number;
  name: string;
  color: string;
  archived: number;
  created_at: string;
}

export interface SearchResult {
  date: string;
  log_content: string;
  tomorrows_plan: string;
}

export interface Holiday {
  date: string;
  label: string;
}

export interface Tag {
  id: number;
  name: string;
  color: string;
  created_at: string;
}

export interface EntryTag {
  entry_date: string;
  tag_id: number;
}

export interface TaskTemplate {
  id: number;
  name: string;
  tasks_json: string;
  recurring: number;
  created_at: string;
}

export interface TaskTemplateDef {
  text: string;
  projectId?: number;
}

export interface SearchFilters {
  query?: string;
  startDate?: string;
  endDate?: string;
  projectId?: number;
  tagId?: number;
  offset?: number;
  limit?: number;
}

export interface SearchResponse {
  results: SearchResult[];
  total: number;
}

export interface TaskFilters {
  status?: string;
  projectId?: number;
  startDate?: string;
  endDate?: string;
}

export interface TimePerProject {
  project_name: string;
  project_color: string;
  total_time: number;
}

export interface WeeklyCompletion {
  week: string;
  completed: number;
}

export interface CompletionRate {
  total: number;
  completed: number;
  rate: number;
}

export interface StreakData {
  currentStreak: number;
  longestStreak: number;
  totalDays: number;
}

export interface WorkloadData {
  date: string;
  task_count: number;
  completed_count: number;
  total_time: number;
}

export interface BacklinkEntry {
  date: string;
  log_content: string;
  tomorrows_plan: string;
}

export type ViewType = 'diary' | 'kanban' | 'stats';

declare global {
  interface Window {
    api: {
      // Entries
      getEntry: (date: string) => Promise<Entry | null>;
      saveEntry: (data: { date: string; logContent: string; tomorrowsPlan: string; blockers: string }) => Promise<Entry>;
      saveConvertedPlanItems: (data: { date: string; items: string[] }) => Promise<{ success: boolean }>;
      deleteEntry: (date: string) => Promise<{ success: boolean }>;
      searchEntries: (query: string) => Promise<SearchResult[]>;
      searchEntriesAdvanced: (filters: SearchFilters) => Promise<SearchResponse>;
      getEntryDates: () => Promise<string[]>;

      // Tasks
      getTasks: (date: string) => Promise<Task[]>;
      addTask: (data: { date: string; text: string; projectId?: number }) => Promise<Task>;
      toggleTask: (id: number) => Promise<Task>;
      deleteTask: (id: number) => Promise<{ success: boolean }>;
      updateTaskText: (data: { id: number; text: string }) => Promise<Task>;
      updateTaskProject: (data: { id: number; projectId: number | null }) => Promise<Task>;
      reorderTasks: (taskOrders: { id: number; position: number }[]) => Promise<{ success: boolean }>;
      updateTaskStatus: (data: { id: number; status: string }) => Promise<Task>;
      getAllTasks: (filters?: TaskFilters) => Promise<Task[]>;

      // Time tracking
      startTimer: (id: number) => Promise<Task>;
      stopTimer: (id: number) => Promise<Task>;
      setManualTime: (data: { id: number; seconds: number }) => Promise<Task>;

      // Projects
      getProjects: () => Promise<Project[]>;
      addProject: (data: { name: string; color?: string }) => Promise<Project>;
      updateProject: (data: { id: number; name: string; color: string }) => Promise<Project>;
      deleteProject: (id: number) => Promise<{ success: boolean }>;

      // Holidays
      getHoliday: (date: string) => Promise<Holiday | null>;
      setHoliday: (data: { date: string; label: string }) => Promise<Holiday>;
      removeHoliday: (date: string) => Promise<{ success: boolean }>;
      getHolidaysInRange: (data: { startDate: string; endDate: string }) => Promise<Holiday[]>;
      getAllHolidays: () => Promise<Holiday[]>;
      isNonWorkingDay: (date: string) => Promise<boolean>;
      getPreviousWorkingDay: (date: string) => Promise<string>;

      // Tags
      getTags: () => Promise<Tag[]>;
      addTag: (data: { name: string; color: string }) => Promise<Tag>;
      updateTag: (data: { id: number; name: string; color: string }) => Promise<Tag>;
      deleteTag: (id: number) => Promise<{ success: boolean }>;
      getTagsForEntry: (date: string) => Promise<Tag[]>;
      addTagToEntry: (data: { date: string; tagId: number }) => Promise<{ success: boolean }>;
      removeTagFromEntry: (data: { date: string; tagId: number }) => Promise<{ success: boolean }>;

      // Task Templates
      getTaskTemplates: () => Promise<TaskTemplate[]>;
      addTaskTemplate: (data: { name: string; tasks: TaskTemplateDef[]; recurring?: boolean }) => Promise<TaskTemplate>;
      deleteTaskTemplate: (id: number) => Promise<{ success: boolean }>;
      updateTaskTemplate: (data: { id: number; name: string; tasks: TaskTemplateDef[]; recurring?: boolean }) => Promise<TaskTemplate>;
      applyTemplate: (data: { templateId: number; date: string }) => Promise<Task[]>;
      applyRecurringTemplates: (date: string) => Promise<Task[]>;

      // Statistics
      getTimePerProject: (data: { startDate: string; endDate: string }) => Promise<TimePerProject[]>;
      getCompletedPerWeek: (data: { startDate: string; endDate: string }) => Promise<WeeklyCompletion[]>;
      getCompletionRate: (data: { startDate: string; endDate: string }) => Promise<CompletionRate>;
      getStreaks: () => Promise<StreakData>;

      // Workload heatmap
      getWorkloadPerDate: (data: { startDate: string; endDate: string }) => Promise<WorkloadData[]>;

      // Backlinks
      getEntriesMentioningDate: (date: string) => Promise<BacklinkEntry[]>;

      // Carry-over
      getIncompleteTasks: (date: string) => Promise<Task[]>;
      carryOverTasks: (data: { fromDate: string; toDate: string }) => Promise<Task[]>;

      // Settings
      getSetting: (key: string) => Promise<string | null>;
      setSetting: (data: { key: string; value: string }) => Promise<{ key: string; value: string }>;

      // Export
      exportData: (format: 'json' | 'csv') => Promise<{ success: boolean; filePath?: string }>;
      exportMarkdown: (data: { date: string; content: string }) => Promise<{ success: boolean; filePath?: string }>;
      exportPDF: (data: { date: string }) => Promise<{ success: boolean; filePath?: string }>;

      // Attachments
      saveAttachment: (data: { date: string; name: string; buffer: ArrayBuffer }) => Promise<{ url: string }>;
      pickImage: (date?: string) => Promise<{ url: string; name: string } | null>;

      // Reset
      resetAllData: () => Promise<{ success: boolean }>;

      // Menu events
      onMenuExport: (callback: (format: 'json' | 'csv') => void) => () => void;
      onMenuImportComplete: (callback: (result: { success: boolean; error?: string }) => void) => () => void;

      // Theme
      getSystemTheme: () => Promise<boolean>;
      onThemeChanged: (callback: (isDark: boolean) => void) => () => void;
    };
  }
}
