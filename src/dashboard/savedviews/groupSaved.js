// Saved views / saved filters grouped as in the designs: the user's private ones, then all public ones.
export function groupSaved(items) {
  return {
    private: items.filter((item) => item.visibility !== 'public'),
    public: items.filter((item) => item.visibility === 'public'),
  }
}
