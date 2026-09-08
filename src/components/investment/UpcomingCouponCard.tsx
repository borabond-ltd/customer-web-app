"use client"
import { useState } from 'react'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'
import { apiClient } from '@/lib/api-client'
import { Calendar, DollarSign } from 'lucide-react'

type Props = {
  purchaseId: string
  bondName: string
  nextCouponDate: string
  amount?: number
  amountCurrency?: 'UGX' | 'USD'
  initialAction?: 'withdraw' | 'reinvest' | null
  isExpired?: boolean
  compact?: boolean
}

export function UpcomingCouponCard({ purchaseId, bondName, nextCouponDate, amount, amountCurrency = 'UGX', initialAction = null, isExpired = false, compact = true }: Props) {
  const [selectedAction, setSelectedAction] = useState<'withdraw' | 'reinvest' | null>(initialAction)
  const [submitting, setSubmitting] = useState(false)

  const disabled = submitting || isExpired || !!selectedAction

  const onSelect = async (action: 'withdraw' | 'reinvest') => {
    if (disabled) return
    setSubmitting(true)
    try {
      const res = await apiClient.submitCouponAction(purchaseId, action)
      if (res.success) {
        setSelectedAction(action)
        toast.success(`Preference saved: ${action === 'withdraw' ? 'Withdraw' : 'Reinvest'}`)
      } else {
        toast.error(res.message || 'Failed to save preference')
      }
    } catch (e: any) {
      toast.error(e?.message || 'Failed to save preference')
    } finally {
      setSubmitting(false)
    }
  }

  const formatAmount = (value: number, currency: 'UGX' | 'USD') => {
    try {
      return new Intl.NumberFormat(currency === 'UGX' ? 'en-UG' : 'en-US', {
        style: 'currency',
        currency,
        minimumFractionDigits: currency === 'UGX' ? 0 : 2,
        maximumFractionDigits: currency === 'UGX' ? 0 : 2
      }).format(value)
    } catch (_) {
      return value.toLocaleString()
    }
  }

  return (
    <Card>
      <CardHeader className={compact ? 'py-2' : undefined}>
        <div className="flex items-center justify-between gap-2">
          <CardTitle className={compact ? 'text-sm truncate' : undefined} title={bondName}>
            {bondName}
          </CardTitle>
          <div className={compact ? 'flex items-center gap-1 text-xs text-muted-foreground' : 'flex items-center gap-2 text-sm text-muted-foreground'}>
            <Calendar className={compact ? 'h-3 w-3' : 'h-4 w-4'} />
            <span>{new Date(nextCouponDate).toLocaleDateString()}</span>
          </div>
        </div>
      </CardHeader>
      <CardContent className={compact ? 'py-0' : undefined}>
        <div className={compact ? 'flex items-center justify-between text-xs' : 'flex items-center justify-between text-sm'}>
          <div className="flex items-center gap-2 text-foreground/80">
            <DollarSign className={compact ? 'h-3 w-3' : 'h-4 w-4'} />
            <span className="font-medium">
              {amount !== undefined ? formatAmount(amount, amountCurrency) : '—'}
            </span>
          </div>
          <div className="flex items-center gap-1">
            {selectedAction && (
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-muted text-foreground/70">
                Selected: {selectedAction}
              </span>
            )}
            {isExpired && (
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-orange-100 text-orange-700">
                Closed
              </span>
            )}
          </div>
        </div>

        <div className="mt-2 flex gap-2">
          <Button variant="default" size={compact ? 'sm' : 'sm'} disabled={disabled} onClick={() => onSelect('withdraw')}>Withdraw</Button>
          <Button variant="secondary" size={compact ? 'sm' : 'sm'} disabled={disabled} onClick={() => onSelect('reinvest')}>Reinvest</Button>
        </div>
      </CardContent>
    </Card>
  )
}


