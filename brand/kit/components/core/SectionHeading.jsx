export function SectionHeading({ eyebrow, title, description }) {
  return <header className="lo-section-heading">{eyebrow ? <div className="lo-eyebrow">{eyebrow}</div> : null}<h2 className="lo-section-heading__title">{title}</h2>{description ? <p className="lo-section-heading__description">{description}</p> : null}</header>;
}
