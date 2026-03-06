import { vi, describe, it, expect, beforeAll, beforeEach, afterAll } from 'vitest';
import path from 'path';
import fs from 'fs';
import os from 'os';

// Mock electron so require('electron') doesn't fail at import time
vi.mock('electron', () => ({ app: { getPath: () => '' } }));

import db from '../src/main/database.js';

const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'diary-test-'));
const testDbPath = path.join(tmpDir, 'test.db');

beforeAll(() => {
  db.initialize(testDbPath);
});

beforeEach(() => {
  db.resetAllData();
});

afterAll(() => {
  try {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  } catch {}
});

// ── Entries ──

describe('Entries', () => {
  it('getEntry returns null for non-existent date', () => {
    expect(db.getEntry('2026-01-01')).toBeNull();
  });

  it('saveEntry creates a new entry', () => {
    const entry = db.saveEntry('2026-01-01', 'My log', 'My plan');
    expect(entry).toBeTruthy();
    expect(entry.date).toBe('2026-01-01');
    expect(entry.log_content).toBe('My log');
    expect(entry.tomorrows_plan).toBe('My plan');
  });

  it('saveEntry updates an existing entry (upsert)', () => {
    db.saveEntry('2026-01-01', 'Old log', 'Old plan');
    const updated = db.saveEntry('2026-01-01', 'New log', 'New plan');
    expect(updated.log_content).toBe('New log');
    expect(updated.tomorrows_plan).toBe('New plan');
  });

  it('getEntry retrieves a saved entry', () => {
    db.saveEntry('2026-02-15', 'Test log', 'Test plan');
    const entry = db.getEntry('2026-02-15');
    expect(entry.date).toBe('2026-02-15');
    expect(entry.log_content).toBe('Test log');
  });

  it('searchEntries finds matching entries in log and plan', () => {
    db.saveEntry('2026-01-01', 'Meeting with team', '');
    db.saveEntry('2026-01-02', 'Code review', 'Plan meeting');
    const results = db.searchEntries('meeting');
    expect(results.length).toBe(2);
  });

  it('searchEntries returns empty for no matches', () => {
    db.saveEntry('2026-01-01', 'Some log', '');
    expect(db.searchEntries('nonexistent')).toHaveLength(0);
  });

  it('getEntryDates returns dates in descending order', () => {
    db.saveEntry('2026-01-01', '', '');
    db.saveEntry('2026-01-03', '', '');
    db.saveEntry('2026-01-02', '', '');
    expect(db.getEntryDates()).toEqual(['2026-01-03', '2026-01-02', '2026-01-01']);
  });
});

// ── Tasks ──

describe('Tasks', () => {
  it('addTask creates a task with position 0', () => {
    const task = db.addTask('2026-01-01', 'Write tests', null);
    expect(task.text).toBe('Write tests');
    expect(task.completed).toBe(0);
    expect(task.position).toBe(0);
    expect(task.entry_date).toBe('2026-01-01');
  });

  it('addTask auto-increments position', () => {
    db.addTask('2026-01-01', 'Task 1', null);
    const task2 = db.addTask('2026-01-01', 'Task 2', null);
    const task3 = db.addTask('2026-01-01', 'Task 3', null);
    expect(task2.position).toBe(1);
    expect(task3.position).toBe(2);
  });

  it('getTasks returns tasks sorted by position', () => {
    db.addTask('2026-01-01', 'First', null);
    db.addTask('2026-01-01', 'Second', null);
    const tasks = db.getTasks('2026-01-01');
    expect(tasks).toHaveLength(2);
    expect(tasks[0].text).toBe('First');
    expect(tasks[1].text).toBe('Second');
  });

  it('getTasks returns empty for date with no tasks', () => {
    expect(db.getTasks('2099-12-31')).toEqual([]);
  });

  it('toggleTask toggles completion back and forth', () => {
    const task = db.addTask('2026-01-01', 'Toggle me', null);
    expect(task.completed).toBe(0);

    const toggled = db.toggleTask(task.id);
    expect(toggled.completed).toBe(1);

    const toggledBack = db.toggleTask(task.id);
    expect(toggledBack.completed).toBe(0);
  });

  it('deleteTask removes the task', () => {
    const task = db.addTask('2026-01-01', 'Delete me', null);
    expect(db.deleteTask(task.id)).toEqual({ success: true });
    expect(db.getTasks('2026-01-01')).toHaveLength(0);
  });

  it('updateTaskText changes the text', () => {
    const task = db.addTask('2026-01-01', 'Original', null);
    const updated = db.updateTaskText(task.id, 'Updated');
    expect(updated.text).toBe('Updated');
  });

  it('addTask with project includes project details', () => {
    const project = db.addProject('TestProject', '#ff0000');
    const task = db.addTask('2026-01-01', 'Project task', project.id);
    expect(task.project_id).toBe(project.id);
    expect(task.project_name).toBe('TestProject');
    expect(task.project_color).toBe('#ff0000');
  });

  it('updateTaskProject changes the project', () => {
    const project = db.addProject('Proj1', '#00ff00');
    const task = db.addTask('2026-01-01', 'Task', null);
    const updated = db.updateTaskProject(task.id, project.id);
    expect(updated.project_name).toBe('Proj1');
  });

  it('updateTaskProject to null removes project', () => {
    const project = db.addProject('Proj', '#000');
    const task = db.addTask('2026-01-01', 'Task', project.id);
    const updated = db.updateTaskProject(task.id, null);
    expect(updated.project_id).toBeNull();
    expect(updated.project_name).toBeNull();
  });
});

// ── Time Tracking ──

describe('Time Tracking', () => {
  it('startTimer sets timer_started_at', () => {
    const task = db.addTask('2026-01-01', 'Timer task', null);
    const started = db.startTimer(task.id);
    expect(started.timer_started_at).toBeTruthy();
  });

  it('stopTimer clears timer_started_at and accumulates time', () => {
    const task = db.addTask('2026-01-01', 'Timer task', null);
    db.startTimer(task.id);
    const stopped = db.stopTimer(task.id);
    expect(stopped.timer_started_at).toBeNull();
    expect(stopped.time_spent).toBeGreaterThanOrEqual(0);
  });

  it('stopTimer on task without running timer is a no-op', () => {
    const task = db.addTask('2026-01-01', 'No timer', null);
    const result = db.stopTimer(task.id);
    expect(result.time_spent).toBe(0);
    expect(result.timer_started_at).toBeNull();
  });

  it('setManualTime sets exact seconds', () => {
    const task = db.addTask('2026-01-01', 'Manual time', null);
    const updated = db.setManualTime(task.id, 3600);
    expect(updated.time_spent).toBe(3600);
    expect(updated.timer_started_at).toBeNull();
  });

  it('setManualTime overwrites previous time_spent', () => {
    const task = db.addTask('2026-01-01', 'Overwrite', null);
    db.setManualTime(task.id, 1000);
    const updated = db.setManualTime(task.id, 500);
    expect(updated.time_spent).toBe(500);
  });
});

// ── Projects ──

describe('Projects', () => {
  it('addProject creates a project', () => {
    const project = db.addProject('My Project', '#123456');
    expect(project.name).toBe('My Project');
    expect(project.color).toBe('#123456');
    expect(project.archived).toBe(0);
  });

  it('addProject uses default color when omitted', () => {
    const project = db.addProject('Default Color');
    expect(project.color).toBe('#6366f1');
  });

  it('getProjects returns non-archived projects sorted by name', () => {
    db.addProject('Beta', '#111');
    db.addProject('Alpha', '#222');
    db.addProject('Gamma', '#333');
    const projects = db.getProjects();
    expect(projects).toHaveLength(3);
    expect(projects[0].name).toBe('Alpha');
    expect(projects[1].name).toBe('Beta');
    expect(projects[2].name).toBe('Gamma');
  });

  it('updateProject changes name and color', () => {
    const project = db.addProject('Old Name', '#000');
    const updated = db.updateProject(project.id, 'New Name', '#fff');
    expect(updated.name).toBe('New Name');
    expect(updated.color).toBe('#fff');
  });

  it('deleteProject removes project and nullifies task references', () => {
    const project = db.addProject('ToDelete', '#abc');
    db.addTask('2026-01-01', 'Task with project', project.id);

    db.deleteProject(project.id);

    expect(db.getProjects().find((p) => p.id === project.id)).toBeUndefined();
    const tasks = db.getTasks('2026-01-01');
    expect(tasks[0].project_id).toBeNull();
    expect(tasks[0].project_name).toBeNull();
  });
});

// ── Carry Over ──

describe('Carry Over', () => {
  it('getIncompleteTasks returns only incomplete tasks', () => {
    const t1 = db.addTask('2026-01-01', 'Done task', null);
    db.toggleTask(t1.id);
    db.addTask('2026-01-01', 'Incomplete task', null);

    const incomplete = db.getIncompleteTasks('2026-01-01');
    expect(incomplete).toHaveLength(1);
    expect(incomplete[0].text).toBe('Incomplete task');
  });

  it('carryOverTasks copies incomplete tasks to new date', () => {
    db.addTask('2026-01-01', 'Carry me', null);
    const t2 = db.addTask('2026-01-01', 'Done already', null);
    db.toggleTask(t2.id);

    const carried = db.carryOverTasks('2026-01-01', '2026-01-02');
    expect(carried).toHaveLength(1);
    expect(carried[0].text).toBe('Carry me');
    expect(carried[0].entry_date).toBe('2026-01-02');

    // Verify the new date actually has the task
    expect(db.getTasks('2026-01-02')).toHaveLength(1);
  });

  it('carryOverTasks with no incomplete tasks returns empty', () => {
    const t1 = db.addTask('2026-01-01', 'All done', null);
    db.toggleTask(t1.id);

    const carried = db.carryOverTasks('2026-01-01', '2026-01-02');
    expect(carried).toHaveLength(0);
  });
});

// ── Settings ──

describe('Settings', () => {
  it('getSetting returns null for missing key', () => {
    expect(db.getSetting('nonexistent')).toBeNull();
  });

  it('setSetting stores and retrieves a value', () => {
    db.setSetting('theme', 'dark');
    expect(db.getSetting('theme')).toBe('dark');
  });

  it('setSetting upserts on conflict', () => {
    db.setSetting('key', 'value1');
    db.setSetting('key', 'value2');
    expect(db.getSetting('key')).toBe('value2');
  });
});

// ── Export ──

describe('Export', () => {
  it('exportAllData returns all entries, tasks, and projects', () => {
    db.addProject('P1', '#111');
    db.saveEntry('2026-01-01', 'Log', 'Plan');
    db.addTask('2026-01-01', 'Task 1', null);
    db.addTask('2026-01-01', 'Task 2', null);

    const data = db.exportAllData();
    expect(data.entries).toHaveLength(1);
    expect(data.tasks).toHaveLength(2);
    expect(data.projects).toHaveLength(1);
  });

  it('exportAllData returns empty arrays when no data', () => {
    const data = db.exportAllData();
    expect(data.entries).toEqual([]);
    expect(data.tasks).toEqual([]);
    expect(data.projects).toEqual([]);
  });
});

// ── Import ──

describe('Import', () => {
  it('importData creates entries, tasks, and projects', () => {
    const data = {
      projects: [{ name: 'Imported Project', color: '#abc' }],
      entries: [{ date: '2026-03-01', log_content: 'Imported log', tomorrows_plan: '' }],
      tasks: [
        {
          entry_date: '2026-03-01',
          text: 'Imported task',
          completed: false,
          position: 0,
          project_name: 'Imported Project',
        },
      ],
    };

    const result = db.importData(data);
    expect(result.success).toBe(true);
    expect(result.entriesCount).toBe(1);
    expect(result.tasksCount).toBe(1);
    expect(result.projectsCount).toBe(1);

    // Verify data was actually persisted
    expect(db.getEntry('2026-03-01').log_content).toBe('Imported log');
    expect(db.getTasks('2026-03-01')).toHaveLength(1);
  });

  it('importData handles partial data gracefully', () => {
    const result = db.importData({ entries: [], tasks: [], projects: [] });
    expect(result.success).toBe(true);
    expect(result.entriesCount).toBe(0);
  });

  it('importData rejects null input', () => {
    expect(() => db.importData(null)).toThrow('Invalid data format');
  });

  it('importData rejects non-object input', () => {
    expect(() => db.importData('string')).toThrow('Invalid data format');
  });
});

// ── Reset ──

describe('Reset', () => {
  it('resetAllData clears all tables and prevents re-seeding', () => {
    db.saveEntry('2026-01-01', 'Log', '');
    db.addTask('2026-01-01', 'Task', null);
    db.addProject('Project', '#000');
    db.setSetting('key', 'value');

    const result = db.resetAllData();
    expect(result.success).toBe(true);

    expect(db.getEntry('2026-01-01')).toBeNull();
    expect(db.getTasks('2026-01-01')).toEqual([]);
    expect(db.getProjects()).toEqual([]);
    expect(db.getSetting('key')).toBeNull();
    // onboarding_complete is preserved to prevent sample data from returning
    expect(db.getSetting('onboarding_complete')).toBe('true');
  });
});

// ── Seed ──

describe('runSeedIfNeeded', () => {
  it('seeds data on first run with a fresh database', () => {
    // Use a separate fresh database to simulate first-ever install
    const freshDbPath = path.join(tmpDir, 'fresh-seed-test.db');
    db.initialize(freshDbPath);

    const seeded = db.runSeedIfNeeded();
    expect(seeded).toBe(true);
    expect(db.getSetting('onboarding_complete')).toBe('pending_tour');
    expect(db.getProjects().length).toBeGreaterThan(0);

    // Restore the original test database
    db.initialize(testDbPath);
  });

  it('does not re-seed after data reset', () => {
    // resetAllData sets onboarding_complete='true' to prevent re-seeding
    db.resetAllData();
    const seeded = db.runSeedIfNeeded();
    expect(seeded).toBe(false);
    expect(db.getProjects()).toEqual([]);
  });

  it('does not re-seed when onboarding_complete is already set', () => {
    db.setSetting('onboarding_complete', 'true');
    const seeded = db.runSeedIfNeeded();
    expect(seeded).toBe(false);
  });
});
