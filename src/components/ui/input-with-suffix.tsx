import * as React from 'react';
import { cn } from '@/lib/utils';

export interface InputWithSuffixProps
  extends React.InputHTMLAttributes<HTMLInputElement> {
  suffix?: string;
  prefix?: string;
}

const InputWithSuffix = React.forwardRef<HTMLInputElement, InputWithSuffixProps>(
  ({ className, type, suffix, prefix, ...props }, ref) => {
    return (
      <div className="relative flex items-center">
        {prefix && (
          <span className="absolute left-3 text-sm text-muted-foreground">
            {prefix}
          </span>
        )}
        <input
          type={type}
          className={cn(
            'flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50',
            prefix && 'pl-10',
            suffix && 'pr-10',
            className
          )}
          ref={ref}
          {...props}
        />
        {suffix && (
          <span className="absolute right-3 text-sm text-muted-foreground">
            {suffix}
          </span>
        )}
      </div>
    );
  }
);

InputWithSuffix.displayName = 'InputWithSuffix';

export { InputWithSuffix };

// Add the following to your global CSS or in the component's CSS module:
// .suffix-input::-webkit-outer-spin-button,
// .suffix-input::-webkit-inner-spin-button {
//   -webkit-appearance: none;
//   margin: 0;
// }
// 
// .suffix-input[type='number'] {
//   -moz-appearance: textfield;
// }
