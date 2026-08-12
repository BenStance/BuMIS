import { FinancialDocumentWorkspace } from '../documents/FinancialDocumentWorkspace.jsx'

export function PurchaseInvoicesPage({ documentId = null }) {
  return <FinancialDocumentWorkspace docType="purchase" initialDocumentId={documentId} />
}

export default PurchaseInvoicesPage
