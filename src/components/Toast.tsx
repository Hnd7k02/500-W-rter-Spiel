import { AlertIcon } from './icons';

export interface ToastMessage {
  id: number;
  text: string;
}

/** Schwebende Meldung oben, 1.6 s sichtbar. Der Bereich bleibt für Screenreader immer da. */
export function Toast({ message }: { message: ToastMessage | null }) {
  return (
    <div className="toast-region" role="status" aria-live="polite">
      {message && (
        <div key={message.id} className="toast">
          <span className="toast__icon" aria-hidden="true">
            <AlertIcon />
          </span>
          {message.text}
        </div>
      )}
    </div>
  );
}
