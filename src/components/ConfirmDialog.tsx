import { useEffect, useRef } from 'react';

interface ConfirmDialogProps {
  open: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}

/** Dialog im iOS-Stil vor einem neuen Wort, wenn die Runde läuft. */
export function ConfirmDialog({ open, onCancel, onConfirm }: ConfirmDialogProps) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const onCancelRef = useRef(onCancel);
  onCancelRef.current = onCancel;

  useEffect(() => {
    if (!open) return;
    const previous = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    // Fokus auf den Dialog selbst: Screenreader lesen Titel und Text, Tab führt zu den Buttons.
    dialogRef.current?.focus();

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onCancelRef.current();
        return;
      }
      if (e.key !== 'Tab') return;
      // Fokus bleibt im Dialog
      const buttons = dialogRef.current?.querySelectorAll('button');
      if (!buttons || buttons.length === 0) return;
      const first = buttons[0];
      const last = buttons[buttons.length - 1];
      const active = document.activeElement;
      if (e.shiftKey && (active === first || active === dialogRef.current)) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && active === last) {
        e.preventDefault();
        first.focus();
      }
    };
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      previous?.focus();
    };
  }, [open]);

  if (!open) return null;

  return (
    <div className="dialog-backdrop">
      <div
        ref={dialogRef}
        tabIndex={-1}
        className="dialog"
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="confirm-title"
        aria-describedby="confirm-text"
      >
        <div className="dialog__body">
          <h2 className="dialog__title" id="confirm-title">
            Neues Wort?
          </h2>
          <p className="dialog__text" id="confirm-text">
            Die laufende Runde wird beendet.
          </p>
        </div>
        <div className="dialog__actions">
          <button type="button" className="dialog__btn" onClick={onCancel}>
            Abbrechen
          </button>
          <button type="button" className="dialog__btn dialog__btn--primary" onClick={onConfirm}>
            Neues Wort
          </button>
        </div>
      </div>
    </div>
  );
}
