import { useState, useEffect, useCallback } from 'react';

interface TourStep {
  target: string;          // data-tour attribute value
  title: string;
  description: string;
  position: 'bottom' | 'top' | 'left' | 'right' | 'center';
}

const STEPS: TourStep[] = [
  {
    target: '',
    title: 'Welcome to OneLog!',
    description: 'Your personal work journal for logging daily activities, tracking tasks, and planning ahead. Let\'s take a quick tour of the key features.',
    position: 'center',
  },
  {
    target: 'sidebar',
    title: 'Sidebar Navigation',
    description: 'Browse your entries by date, search across all logs, and manage projects. Dates with entries are highlighted for quick navigation.',
    position: 'right',
  },
  {
    target: 'date-nav',
    title: 'Date Navigation',
    description: 'Use the arrow buttons or Alt+← / Alt+→ to move between days. Click "Today" to jump back to the current date.',
    position: 'bottom',
  },
  {
    target: 'daily-log',
    title: 'Daily Log',
    description: 'Write about your day using the rich text editor. Supports headings, lists, code blocks, and more. Your work is auto-saved as you type.',
    position: 'bottom',
  },
  {
    target: 'task-list',
    title: 'Task Tracking',
    description: 'Add tasks, mark them complete, assign projects, and track time spent with the built-in timer or manual entry. Incomplete tasks can be carried over to the next day.',
    position: 'top',
  },
  {
    target: 'tomorrow-plan',
    title: "Tomorrow's Plan",
    description: 'Plan ahead by jotting down what you intend to work on tomorrow. Great for morning stand-ups and staying organized.',
    position: 'top',
  },
  {
    target: '',
    title: 'Import & Export',
    description: 'Use the Tools menu in the menu bar to import data from JSON or export your diary as JSON/CSV anytime.',
    position: 'center',
  },
  {
    target: '',
    title: 'Keyboard Shortcuts',
    description: 'Alt+S to save, Alt+← / Alt+→ to navigate days, Alt+K for command palette. Access full help from the Help menu in the title bar.',
    position: 'center',
  },
  {
    target: '',
    title: 'You\'re All Set!',
    description: 'The app is loaded with sample data so you can explore. Use "Reset All Data" in the sidebar when you\'re ready to start fresh. Happy journaling!',
    position: 'center',
  },
];

interface GuidedTourProps {
  onComplete: () => void;
}

export default function GuidedTour({ onComplete }: GuidedTourProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [spotlightRect, setSpotlightRect] = useState<DOMRect | null>(null);

  const step = STEPS[currentStep];

  const updateSpotlight = useCallback(() => {
    if (!step.target) {
      setSpotlightRect(null);
      return;
    }
    const el = document.querySelector(`[data-tour="${step.target}"]`);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      // Allow scroll to settle before measuring position
      requestAnimationFrame(() => {
        setSpotlightRect(el.getBoundingClientRect());
      });
    } else {
      setSpotlightRect(null);
    }
  }, [step.target]);

  useEffect(() => {
    updateSpotlight();
    window.addEventListener('resize', updateSpotlight);
    return () => window.removeEventListener('resize', updateSpotlight);
  }, [updateSpotlight]);

  const next = () => {
    if (currentStep < STEPS.length - 1) setCurrentStep(currentStep + 1);
    else onComplete();
  };

  const prev = () => {
    if (currentStep > 0) setCurrentStep(currentStep - 1);
  };

  // Compute tooltip position
  const getTooltipStyle = (): React.CSSProperties => {
    if (step.position === 'center' || !spotlightRect) {
      return {
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
      };
    }

    const pad = 16;
    const tooltipWidth = 360;

    // Clamp left so the tooltip never overflows the right edge
    const clampLeft = (rawLeft: number) =>
      Math.max(pad, Math.min(rawLeft, window.innerWidth - tooltipWidth - pad));

    switch (step.position) {
      case 'right':
        return {
          top: Math.max(pad, spotlightRect.top),
          left: spotlightRect.right + pad,
          maxWidth: tooltipWidth,
        };
      case 'left':
        return {
          top: Math.max(pad, spotlightRect.top),
          right: window.innerWidth - spotlightRect.left + pad,
          maxWidth: tooltipWidth,
        };
      case 'bottom':
        return {
          top: spotlightRect.bottom + pad,
          left: clampLeft(spotlightRect.left),
          maxWidth: tooltipWidth,
        };
      case 'top':
        return {
          bottom: window.innerHeight - spotlightRect.top + pad,
          left: clampLeft(spotlightRect.left),
          maxWidth: tooltipWidth,
        };
      default:
        return { top: '50%', left: '50%', transform: 'translate(-50%, -50%)' };
    }
  };

  const isLast = currentStep === STEPS.length - 1;
  const isFirst = currentStep === 0;

  return (
    <div className="fixed inset-0 z-[9999]">
      {/* Overlay with spotlight cutout */}
      <svg className="absolute inset-0 w-full h-full" style={{ pointerEvents: 'none' }}>
        <defs>
          <mask id="tour-mask">
            <rect x="0" y="0" width="100%" height="100%" fill="white" />
            {spotlightRect && (
              <rect
                x={spotlightRect.left - 6}
                y={spotlightRect.top - 6}
                width={spotlightRect.width + 12}
                height={spotlightRect.height + 12}
                rx="8"
                fill="black"
              />
            )}
          </mask>
        </defs>
        <rect
          x="0" y="0" width="100%" height="100%"
          fill="rgba(15, 38, 35, 0.55)"
          mask="url(#tour-mask)"
        />
      </svg>

      {/* Spotlight glow border */}
      {spotlightRect && (
        <div
          className="absolute rounded-lg ring-2 ring-iqz-blue ring-offset-2 pointer-events-none"
          style={{
            top: spotlightRect.top - 6,
            left: spotlightRect.left - 6,
            width: spotlightRect.width + 12,
            height: spotlightRect.height + 12,
          }}
        />
      )}

      {/* Click blocker (transparent, behind tooltip) */}
      <div className="absolute inset-0" onClick={(e) => e.stopPropagation()} />

      {/* Tooltip card */}
      <div
        className="absolute bg-white rounded-xl shadow-2xl p-5 z-10 border border-gray-100 dark:bg-slate-800 dark:border-gray-700"
        style={{ ...getTooltipStyle(), minWidth: 300 }}
      >
        {/* Step indicator dots */}
        <div className="flex items-center gap-1 mb-3">
          {STEPS.map((_, i) => (
            <div
              key={i}
              className={`h-1.5 rounded-full transition-all ${
                i === currentStep
                  ? 'w-5 bg-iqz-blue'
                  : i < currentStep
                  ? 'w-1.5 bg-iqz-blue/40'
                  : 'w-1.5 bg-gray-200 dark:bg-gray-600'
              }`}
            />
          ))}
          <span className="ml-auto text-[10px] text-gray-400 dark:text-gray-500 font-medium">
            {currentStep + 1}/{STEPS.length}
          </span>
        </div>

        <h3 className="text-base font-bold text-iqz-navy dark:text-white mb-1.5">{step.title}</h3>
        <p className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed mb-4">{step.description}</p>

        <div className="flex items-center justify-between">
          <button
            onClick={onComplete}
            className="text-xs text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300"
          >
            Skip tour
          </button>
          <div className="flex gap-2">
            {!isFirst && (
              <button
                onClick={prev}
                className="px-3 py-1.5 text-xs font-medium text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50 dark:text-gray-300 dark:border-gray-600 dark:hover:bg-slate-700"
              >
                Back
              </button>
            )}
            <button
              onClick={next}
              className="px-4 py-1.5 text-xs font-medium text-white bg-iqz-blue rounded-lg hover:bg-iqz-blue-light"
            >
              {isLast ? 'Get Started' : 'Next'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
