import RichTextEditor from './RichTextEditor';

interface DailyLogProps {
  value: string;
  onChange: (value: string) => void;
  currentDate?: string;
  onNavigateToDate?: (date: string) => void;
}

export default function DailyLog({ value, onChange, currentDate, onNavigateToDate }: DailyLogProps) {
  return (
    <section data-tour="daily-log">
      <label className="block text-sm font-semibold text-iqz-navy dark:text-white mb-2">
        📝 Daily Log
      </label>
      <RichTextEditor
        content={value}
        onChange={onChange}
        placeholder="What happened today? Meetings, decisions, wins, blockers..."
        minHeight="12rem"
        currentDate={currentDate}
        onNavigateToDate={onNavigateToDate}
      />
    </section>
  );
}
