import { useEffect, useRef } from 'react';

type DialogRef = { current: HTMLElement | null };

const focusableSelector = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled]):not([type="hidden"])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(',');

function getFocusable(dialog: HTMLElement) {
  return Array.from(dialog.querySelectorAll<HTMLElement>(focusableSelector)).filter((element) => (
    !element.hasAttribute('disabled')
    && element.getAttribute('aria-hidden') !== 'true'
    && window.getComputedStyle(element).visibility !== 'hidden'
    && element.getClientRects().length > 0
  ));
}

export function useDialogFocus(dialogRef: DialogRef, isOpen: boolean, onClose: () => void, canClose = true) {
  const onCloseRef = useRef(onClose);
  const canCloseRef = useRef(canClose);
  onCloseRef.current = onClose;
  canCloseRef.current = canClose;

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!isOpen || !dialog) return;

    const opener = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const focusOnOpen = window.requestAnimationFrame(() => {
      if (!dialog.isConnected) return;
      const preferred = dialog.querySelector<HTMLElement>('[data-autofocus]');
      (preferred || getFocusable(dialog)[0] || dialog).focus({ preventScroll: true });
    });

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        event.stopPropagation();
        if (canCloseRef.current) onCloseRef.current();
        return;
      }
      if (event.key !== 'Tab') return;

      const items = getFocusable(dialog);
      if (!items.length) {
        event.preventDefault();
        dialog.focus();
        return;
      }
      const first = items[0];
      const last = items[items.length - 1];
      const active = document.activeElement;
      if (event.shiftKey && (active === first || active === dialog || !dialog.contains(active))) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && (active === last || active === dialog || !dialog.contains(active))) {
        event.preventDefault();
        first.focus();
      }
    };

    const keepFocusInside = (event: FocusEvent) => {
      if (event.target instanceof Node && dialog.contains(event.target)) return;
      (getFocusable(dialog)[0] || dialog).focus({ preventScroll: true });
    };

    document.addEventListener('keydown', handleKeyDown, true);
    document.addEventListener('focusin', keepFocusInside, true);

    return () => {
      window.cancelAnimationFrame(focusOnOpen);
      document.removeEventListener('keydown', handleKeyDown, true);
      document.removeEventListener('focusin', keepFocusInside, true);
      document.body.style.overflow = previousOverflow;
      if (opener?.isConnected) opener.focus({ preventScroll: true });
    };
  }, [dialogRef, isOpen]);
}
