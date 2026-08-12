import { FinancialDocumentWorkspace } from '../documents/FinancialDocumentWorkspace.jsx'

export function PaymentVouchersPage({ documentId = null }) {
  return <FinancialDocumentWorkspace docType="voucher" initialDocumentId={documentId} />
}

export default PaymentVouchersPage
