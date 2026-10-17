import type { CSSProperties } from 'react';
import { AlertIcon, EraserIcon } from './icons';

export interface ToastMessage {
  id: number;
  text: string;
  /** error: Fehler beim Prüfen; info: Bestätigung, z. B. nach dem Radierer */
  tone: 'error' | 'info';
  /** Sichtbar in Millisekunden */
  duration: number;
  action?: { label: string; onAction: () => void };
}

/** Schwebende Meldung oben. Der Bereich bleibt für Screenreader immer da. */
export function Toast({ message }: { message: ToastMessage | null }) {
  return (
    <div className="toast-region" role="status" aria-live="polite">
      {message && (
        <div
          key={message.id}
          className={`toast toast--${message.tone}`}
          style={{ '--toast-ms': `${message.duration}ms` } as CSSProperties}
        >
          <span className="toast__icon" aria-hidden="true">
            {message.tone === 'info' ? <EraserIcon size={16} /> : <AlertIcon />}
          </span>
          <span className="toast__text">{message.text}</span>
          {message.action && (
            <button type="button" className="toast__action" onClick={message.action.onAction}>
              {message.action.label}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
