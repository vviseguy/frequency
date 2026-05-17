import { AnimatePresence, motion } from 'framer-motion';
import { AlertTriangle, CheckCircle2, Info } from 'lucide-react';
import { dismissToast, useToasts, type ToastKind } from '../hooks/useToast';

const ICON = {
  error: <AlertTriangle size={18} strokeWidth={2.5} />,
  info: <Info size={18} strokeWidth={2.5} />,
  success: <CheckCircle2 size={18} strokeWidth={2.5} />,
};
const BG: Record<ToastKind, string> = {
  error: 'bg-coral text-white',
  info: 'bg-white',
  success: 'bg-lime',
};

export function Toaster() {
  const toasts = useToasts();
  return (
    <div className="fixed right-3 top-16 z-[80] flex w-[min(20rem,calc(100vw-1.5rem))] flex-col gap-2">
      <AnimatePresence>
        {toasts.map((t) => (
          <motion.button
            key={t.id}
            layout
            initial={{ opacity: 0, x: 40, scale: 0.9 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: 40, scale: 0.9 }}
            transition={{ type: 'spring', stiffness: 340, damping: 24 }}
            onClick={() => dismissToast(t.id)}
            className={`flex items-start gap-2 rounded-2xl border-3 border-ink ${BG[t.kind]} px-4 py-3
              text-left font-display text-sm font-extrabold shadow-pop`}
          >
            <span className="mt-0.5 shrink-0">{ICON[t.kind]}</span>
            <span className="leading-tight">{t.message}</span>
          </motion.button>
        ))}
      </AnimatePresence>
    </div>
  );
}
