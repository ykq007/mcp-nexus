import React, { useId } from 'react';

export type SegmentedOption<T extends string = string> = {
  value: T;
  label: React.ReactNode;
  /** Accessible label when label is not a plain string */
  ariaLabel?: string;
  disabled?: boolean;
};

export function SegmentedControl<T extends string = string>({
  options,
  value,
  onChange,
  'aria-label': ariaLabel,
  size = 'base'
}: {
  options: SegmentedOption<T>[];
  value: T;
  onChange: (value: T) => void;
  'aria-label'?: string;
  size?: 'base' | 'sm' | 'xs';
}) {
  const groupId = useId();

  return (
    <div
      role="radiogroup"
      aria-label={ariaLabel}
      className={`segmented ${size !== 'base' ? `segmented--${size}` : ''}`}
    >
      {options.map((opt) => {
        const id = `${groupId}-${opt.value}`;
        const checked = opt.value === value;
        return (
          <label
            key={opt.value}
            htmlFor={id}
            className={`segmentedItem${checked ? ' segmentedItem--active' : ''}${opt.disabled ? ' segmentedItem--disabled' : ''}`}
            aria-label={typeof opt.label !== 'string' ? opt.ariaLabel : undefined}
          >
            <input
              type="radio"
              id={id}
              name={groupId}
              value={opt.value}
              checked={checked}
              disabled={opt.disabled}
              onChange={() => onChange(opt.value)}
              className="srOnly"
            />
            {opt.label}
          </label>
        );
      })}
    </div>
  );
}
