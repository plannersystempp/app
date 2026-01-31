import { describe, it, expect, vi } from 'vitest'
import React from 'react'
import ReactDOM from 'react-dom/client'
import { act } from 'react-dom/test-utils'
import { SupplierPaymentDialog } from '../SupplierPaymentDialog'

const patchEventSupplierCostPayments = vi.fn()

vi.mock('@/contexts/EnhancedDataContext', () => ({
  useEnhancedData: () => ({
    patchEventSupplierCostPayments,
  }),
}))

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({ user: null }),
}))

vi.mock('@/services/supplierService', () => ({
  fetchSupplierPayments: vi.fn(async () => [
    {
      id: 'pay-1',
      amount: 56,
      payment_date: '2026-01-01',
      created_by: { email: 'teste@plannersystem.com' },
    },
  ]),
  createSupplierPayment: vi.fn(async () => 'pay-2'),
  deleteSupplierPayment: vi.fn(async () => undefined),
}))

describe('SupplierPaymentDialog (reatividade)', () => {
  it('recalcula pago/restante com base no histórico e sincroniza estado local', async () => {
    const container = document.createElement('div')
    document.body.appendChild(container)
    const root = ReactDOM.createRoot(container)

    await act(async () => {
      root.render(
        <SupplierPaymentDialog
          open={true}
          onOpenChange={() => {}}
          cost={{
            id: 'cost-1',
            description: 'Microfone',
            supplier_name: 'Fornecedor B',
            total_amount: 100,
            paid_amount: 0,
          }}
          onSuccess={() => {}}
        />
      )
      await new Promise((r) => setTimeout(r, 0))
    })

    expect(document.body.innerHTML).toContain('Microfone')
    expect(document.body.innerHTML).toContain('56,00')
    expect(document.body.innerHTML).toContain('44,00')
    expect(patchEventSupplierCostPayments).toHaveBeenCalledWith('cost-1', 56)

    await act(async () => {
      root.unmount()
    })
  })
})

