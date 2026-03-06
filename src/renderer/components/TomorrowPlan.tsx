import RichTextEditor from './RichTextEditor';

interface TomorrowPlanProps {
  value: string;
  onChange: (value: string) => void;
  currentDate?: string;
  onNavigateToDate?: (date: string) => void;
}

export default function TomorrowPlan({ value, onChange, currentDate, onNavigateToDate }: TomorrowPlanProps) {
  return (
    <section data-tour="tomorrow-plan">
      <label className="block text-sm font-semibold text-iqz-navy dark:text-white mb-2">
        🎯 Tomorrow's Plan
      </label>
      <RichTextEditor
        content={value}
        onChange={onChange}
        placeholder="What should you focus on tomorrow? Top priorities, follow-ups..."
        minHeight="7rem"
        currentDate={currentDate}
        onNavigateToDate={onNavigateToDate}
      />
    </section>
  );
}
