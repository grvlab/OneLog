export function formatDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function stripHtmlTags(html: string): string {
  if (!html) return '';
  return html
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n')
    .replace(/<\/li>/gi, '\n')
    .replace(/<[^>]*>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

export interface StandupData {
  prevEntry: { log_content: string; tomorrows_plan: string } | null;
  prevTasks: { text: string; completed: number; status: string }[];
  todayTasks: { text: string; completed: number; status: string }[];
  todayBlockers: string;
  prevDate: string;
  todayDate: string;
}

export function generateStandupMessage(data: StandupData): string {
  const { prevEntry, prevTasks, todayTasks, todayBlockers, prevDate, todayDate } = data;

  const fmtDate = (ds: string) => {
    const d = new Date(ds + 'T00:00:00');
    return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
  };

  let msg = `STANDUP  - ${fmtDate(todayDate)}\n\n`;

  // Yesterday
  msg += `Yesterday (${fmtDate(prevDate)}):\n`;
  const completedTasks = prevTasks.filter((t) => t.completed);
  if (completedTasks.length > 0) {
    msg += completedTasks.map((t) => `  - [done] ${t.text}`).join('\n') + '\n';
  }
  if (prevEntry?.log_content) {
    const plain = stripHtmlTags(prevEntry.log_content);
    const lines = plain.split('\n').map((l) => l.trim()).filter(Boolean);
    const highlights = lines.slice(0, 3);
    if (highlights.length > 0) {
      msg += highlights.map((l) => `  - ${l.replace(/^[-*]\s*/, '')}`).join('\n') + '\n';
    }
  }
  if (!prevEntry?.log_content && completedTasks.length === 0) {
    msg += '  (no activity logged)\n';
  }

  // Today
  msg += `\nToday:\n`;
  const pendingTasks = todayTasks.filter((t) => t.status === 'todo' || t.status === 'in_progress');
  if (pendingTasks.length > 0) {
    msg += pendingTasks.map((t) => `  - ${t.text}`).join('\n') + '\n';
  }
  if (prevEntry?.tomorrows_plan) {
    const plain = stripHtmlTags(prevEntry.tomorrows_plan);
    const lines = plain.split('\n').map((l) => l.trim()).filter(Boolean);
    const plans = lines.slice(0, 3);
    if (plans.length > 0 && pendingTasks.length === 0) {
      msg += plans.map((l) => `  - ${l.replace(/^[-*]\s*/, '')}`).join('\n') + '\n';
    }
  }
  if (!prevEntry?.tomorrows_plan && pendingTasks.length === 0) {
    msg += '  (no plan yet)\n';
  }

  // Blockers
  msg += `\nBlockers:\n`;
  const blockersPlain = stripHtmlTags(todayBlockers || '');
  const blockerLines = blockersPlain.split('\n').map((l) => l.trim()).filter(Boolean);
  if (blockerLines.length > 0) {
    msg += blockerLines.map((l) => `  - ${l.replace(/^[-*]\s*/, '')}`).join('\n') + '\n';
  } else {
    msg += '  - (none)\n';
  }

  return msg;
}
