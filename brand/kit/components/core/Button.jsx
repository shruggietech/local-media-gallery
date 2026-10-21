export function Button({ variant = "primary", size = "md", children, ...props }) {
  return <button className={`lo-button lo-button--${variant} lo-button--${size}`} type="button" {...props}>{children}</button>;
}
