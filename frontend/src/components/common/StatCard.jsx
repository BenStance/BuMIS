export function StatCard({ title, value, description }) {
  return (
    <article className="stat-card">
      <p>{title}</p>
      <div className="stat-card__value">{value}</div>
      {description ? <p>{description}</p> : null}
    </article>
  )
}
