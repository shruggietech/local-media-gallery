export function Card({ children, ...props }) {
  return <div className="lo-card" {...props}>{children}</div>;
}
