import { FinancialDocumentWorkspace } from '../documents/FinancialDocumentWorkspace.jsx'

export function SalesReceiptsPage({ documentId = null }) {
  return <FinancialDocumentWorkspace docType="receipt" initialDocumentId={documentId} />
}

export default SalesReceiptsPage
