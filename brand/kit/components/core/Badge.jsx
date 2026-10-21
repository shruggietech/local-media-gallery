export function Badge({ tone = "neutral", children }) {
  return <span className={`lo-badge lo-badge--${tone}`}>{children}</span>;
}
