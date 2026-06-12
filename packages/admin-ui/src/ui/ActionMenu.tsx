import React, { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { Portal } from './Portal';

export type ActionMenuOption = {
  id: string;
  label: React.ReactNode;
  icon?: React.ReactNode;
  disabled?: boolean;
  danger?: boolean;
  onClick: () => void;
};

interface ActionMenuProps {
  options: ActionMenuOption[];
  /** Trigger element; defaults to an ellipsis "⋯" icon button */
  trigger?: React.ReactNode;
  'aria-label'?: string;
}

export function ActionMenu({ options, trigger, 'aria-label': ariaLabel }: ActionMenuProps) {
  const [open, setOpen] = useState(false);
  const [focusedIndex, setFocusedIndex] = useState(0);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const itemRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const [menuPos, setMenuPos] = useState<{ top: number; right: number } | null>(null);

  const updatePosition = useCallback(() => {
    const trigger = triggerRef.current;
    if (!trigger) return;
    const rect = trigger.getBoundingClientRect();
    const margin = 8;
    setMenuPos({
      top: rect.bottom + 6,
      right: window.innerWidth - rect.right - margin
    });
  }, []);

  const handleMenuRef = useCallback(
    (el: HTMLDivElement | null) => {
      (menuRef as React.MutableRefObject<HTMLDivElement | null>).current = el;
      if (el) updatePosition();
    },
    [updatePosition]
  );

  useLayoutEffect(() => {
    if (!open) return;
    updatePosition();
  }, [open, updatePosition]);

  useEffect(() => {
    if (!open) return;
    const onWindowChange = () => updatePosition();
    window.addEventListener('resize', onWindowChange);
    window.addEventListener('scroll', onWindowChange, true);
    return () => {
      window.removeEventListener('resize', onWindowChange);
      window.removeEventListener('scroll', onWindowChange, true);
    };
  }, [open, updatePosition]);

  // Click outside to close
  useEffect(() => {
    if (!open) return;
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node | null;
      if (!target) return;
      if (triggerRef.current?.contains(target)) return;
      if (menuRef.current?.contains(target)) return;
      setOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [open]);

  // Keyboard navigation
  useEffect(() => {
    if (!open) return;
    const enabledOptions = options.filter((o) => !o.disabled);
    const handleKeyDown = (e: KeyboardEvent) => {
      switch (e.key) {
        case 'Escape':
          e.preventDefault();
          setOpen(false);
          triggerRef.current?.focus();
          break;
        case 'ArrowDown':
          e.preventDefault();
          setFocusedIndex((prev) => (prev + 1) % enabledOptions.length);
          break;
        case 'ArrowUp':
          e.preventDefault();
          setFocusedIndex((prev) => (prev - 1 + enabledOptions.length) % enabledOptions.length);
          break;
        case 'Enter':
        case ' ': {
          e.preventDefault();
          const opt = enabledOptions[focusedIndex];
          if (opt) {
            opt.onClick();
            setOpen(false);
            triggerRef.current?.focus();
          }
          break;
        }
        case 'Home':
          e.preventDefault();
          setFocusedIndex(0);
          break;
        case 'End':
          e.preventDefault();
          setFocusedIndex(enabledOptions.length - 1);
          break;
        case 'Tab':
          // Per the ARIA menu pattern: Tab closes the menu and focus moves on
          // from the trigger in normal document order.
          setOpen(false);
          triggerRef.current?.focus();
          break;
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [open, focusedIndex, options]);

  useEffect(() => {
    if (open) setFocusedIndex(0);
  }, [open]);

  // Move real DOM focus to the highlighted menuitem so screen readers
  // announce arrow-key navigation (roving tabindex pattern).
  useEffect(() => {
    if (!open) return;
    itemRefs.current[focusedIndex]?.focus();
  }, [open, focusedIndex, menuPos]);

  const enabledOptions = options.filter((o) => !o.disabled);

  return (
    <div style={{ position: 'relative', display: 'inline-flex' }}>
      <button
        ref={triggerRef}
        type="button"
        className="btn btn--sm btn--icon"
        data-variant="ghost"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={ariaLabel ?? 'More actions'}
        onClick={() => setOpen((prev) => !prev)}
      >
        {trigger ?? <span aria-hidden="true" style={{ fontSize: 16, letterSpacing: 1 }}>⋯</span>}
      </button>

      {open ? (
        <Portal>
          <div
            ref={handleMenuRef}
            className="actionMenu"
            role="menu"
            aria-label={ariaLabel ?? 'More actions'}
            style={{
              position: 'fixed',
              top: menuPos?.top ?? 0,
              right: menuPos?.right ?? 8,
              minWidth: 176
            }}
          >
            {options.map((opt, index) => {
              const enabledIdx = enabledOptions.indexOf(opt);
              const isFocused = enabledIdx === focusedIndex;
              return (
                <button
                  key={opt.id}
                  type="button"
                  role="menuitem"
                  ref={(el) => {
                    if (enabledIdx >= 0) itemRefs.current[enabledIdx] = el;
                  }}
                  tabIndex={isFocused ? 0 : -1}
                  className={`actionMenuItem${opt.danger ? ' danger' : ''}`}
                  disabled={opt.disabled}
                  data-focused={isFocused ? true : undefined}
                  style={opt.disabled ? { opacity: 0.45, cursor: 'not-allowed' } : undefined}
                  onClick={() => {
                    if (!opt.disabled) {
                      opt.onClick();
                      setOpen(false);
                      triggerRef.current?.focus();
                    }
                  }}
                  onMouseEnter={() => {
                    if (!opt.disabled) setFocusedIndex(enabledIdx >= 0 ? enabledIdx : index);
                  }}
                >
                  {opt.icon}
                  {opt.label}
                </button>
              );
            })}
          </div>
        </Portal>
      ) : null}
    </div>
  );
}
