import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

/**
 * Combine class names with clsx then resolve Tailwind conflicts via tailwind-merge.
 * Use this anywhere a `className` prop takes conditional values.
 */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}
