export function EmptyState({ title = 'Nothing here yet', description = 'No records were found.' }) {
  return (
    <div className="empty-state">
      <strong>{title}</strong>
      <div>{description}</div>
    </div>
  )
}
