// Utility function for className merging (clsx installed in Phase 4)
export function cn(...inputs: string[]) {
  return inputs.filter(Boolean).join(' ');
}
