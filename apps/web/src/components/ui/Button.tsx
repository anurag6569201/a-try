import { clsx } from 'clsx';
import React from 'react';

interface BaseProps {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
  className?: string;
  children?: React.ReactNode;
}

interface ButtonEl extends BaseProps, Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, keyof BaseProps> {
  asChild?: false;
}

interface AsChildEl extends BaseProps {
  asChild: true;
  children: React.ReactElement<{ className?: string }>;
}

type Props = ButtonEl | AsChildEl;

const base = 'inline-flex items-center justify-center gap-2 font-medium rounded-lg transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 disabled:opacity-50 disabled:cursor-not-allowed';
const variants = {
  primary:   'bg-brand-600 text-white hover:bg-brand-700 active:bg-brand-800',
  secondary: 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50 active:bg-gray-100',
  ghost:     'text-gray-600 hover:bg-gray-100 active:bg-gray-200',
  danger:    'bg-red-600 text-white hover:bg-red-700',
};
const sizes = { sm: 'px-3 py-1.5 text-sm', md: 'px-4 py-2 text-sm', lg: 'px-6 py-3 text-base' };

export function Button({ variant = 'primary', size = 'md', loading, className, children, asChild, ...rest }: Props) {
  const cls = clsx(base, variants[variant], sizes[size], className);

  if (asChild) {
    const child = children as React.ReactElement<{ className?: string }>;
    return React.cloneElement(child, {
      className: clsx(cls, child.props.className),
    });
  }

  const { disabled, ...btnRest } = rest as React.ButtonHTMLAttributes<HTMLButtonElement>;
  return (
    <button className={cls} disabled={disabled ?? loading} {...btnRest}>
      {loading && (
        <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
      )}
      {children}
    </button>
  );
}
