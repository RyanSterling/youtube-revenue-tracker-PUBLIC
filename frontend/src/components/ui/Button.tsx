import { ButtonHTMLAttributes, ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode;
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  size?: 'sm' | 'md';
  iconLeft?: ReactNode;
  iconRight?: ReactNode;
}

const sizes = {
  sm: 'px-2 py-1 text-sm',
  md: 'px-3 py-1.5 text-sm',
};

export function Button({
  children,
  variant = 'primary',
  size = 'sm',
  iconLeft,
  iconRight,
  className,
  ...props
}: ButtonProps) {
  const baseStyles = cn(
    'inline-flex items-center justify-center gap-1.5',
    'font-medium',
    'rounded-[10px]',
    'transition-all duration-200',
    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-background-primary',
    'disabled:opacity-50 disabled:pointer-events-none'
  );

  const variants = {
    primary: cn(
      'bg-gradient-to-r from-[#DE28CD] to-[#EC5B6F]',
      'text-white',
      'hover:opacity-90',
      'focus-visible:ring-[#EC5B6F]',
      // Gradient direction matching the spec: 82deg
      '[background:linear-gradient(82deg,#DE28CD_-12.02%,#EC5B6F_81.22%)]'
    ),
    secondary: cn(
      'bg-[#2C2C2C]',
      'text-white',
      'hover:bg-[#3C3C3C]',
      'focus-visible:ring-[#2C2C2C]'
    ),
    ghost: cn(
      'bg-[#111]',
      'border-2 border-[#2C2C2C]',
      'text-foreground-secondary',
      'hover:text-foreground-primary hover:border-[#3C3C3C]',
      'focus-visible:ring-[#2C2C2C]'
    ),
    danger: cn(
      'bg-red-600',
      'text-white',
      'hover:bg-red-700',
      'focus-visible:ring-red-600'
    ),
  };

  return (
    <button
      className={cn(baseStyles, sizes[size], variants[variant], className)}
      {...props}
    >
      {iconLeft && <span className="w-3 h-3 flex items-center justify-center">{iconLeft}</span>}
      {children}
      {iconRight && <span className="w-3 h-3 flex items-center justify-center">{iconRight}</span>}
    </button>
  );
}
