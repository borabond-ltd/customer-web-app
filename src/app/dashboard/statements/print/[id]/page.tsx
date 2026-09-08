'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { apiClient } from '@/lib/api-client'

interface StatementDetails {
	id: string
	month: number
	year: number
	statement_period_start: string
	statement_period_end: string
	opening_balance: number
	closing_balance: number
	total_deposits: number
	total_bond_purchases: number
	total_coupon_payouts: number
	transaction_count: number
	created_at: string
	transactions: Array<{
		id: string
		transaction_type: string
		transaction_date: string
		amount: number
		description: string
		bond_name?: string
		payment_rail?: string
	}>
}

function formatUGX(amountUGX: number) {
    // Use absolute value to ensure no negative signs are displayed
    const absoluteAmount = Math.abs(amountUGX);
    return `UGX ${Math.round(absoluteAmount).toLocaleString('en-UG')}`
}

function getMonthName(month: number) {
	const months = ['January','February','March','April','May','June','July','August','September','October','November','December']
	return months[month - 1] || 'Unknown'
}

export default function StatementPrintPage() {
	const params = useParams<{ id: string }>()
	const router = useRouter()
	const [data, setData] = useState<StatementDetails | null>(null)
	const [loading, setLoading] = useState(true)
	const [customerName, setCustomerName] = useState<string>('')
	const [customerEmail, setCustomerEmail] = useState<string>('')

	useEffect(() => {
		const load = async () => {
			try {
				const [res, profile] = await Promise.all([
					apiClient.getStatementDetails(params.id),
					apiClient.getUserProfile().catch(() => ({ success: false }))
				])
				if (res.success) {
					setData(res.data)
					const u = (res as any).data?.user_profiles || (res as any).data?.user
					if (u) {
						const name = u.display_name || u.full_name || [u.first_name, u.last_name].filter(Boolean).join(' ')
						if (name) setCustomerName(name)
						if (u.email) setCustomerEmail(u.email)
					}
				}
				if ((profile as any)?.success) {
					const p = (profile as any).data?.profile || {}
					const name = p.display_name || [p.first_name, p.last_name].filter(Boolean).join(' ')
					if (name) setCustomerName(name)
					if (p.email) setCustomerEmail(p.email)
				}
			} finally {
				setLoading(false)
			}
		}
		load()
	}, [params.id])

	useEffect(() => {
		if (!loading && data) {
			// Defer print to next tick so styles apply
			setTimeout(() => window.print(), 100)
		}
	}, [loading, data])

	if (loading || !data) {
		return (
			<div className="min-h-screen p-8 print:p-0">
				<p className="text-center text-muted-foreground">Preparing statement…</p>
			</div>
		)
	}

	return (
		<div className="min-h-screen bg-white text-black">
			<style>{`
				@page { size: A4; margin: 16mm; }
				@media print { .no-print { display: none; } body { background: white; } }
				.heading { font-weight: 700; letter-spacing: -0.02em; }
				.grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
				.table { width: 100%; border-collapse: collapse; }
				.table th, .table td { border-bottom: 1px solid #e5e7eb; padding: 8px 10px; font-size: 12px; }
				.badge { border:1px solid #d1d5db; font-size:10px; padding:2px 6px; border-radius:9999px; }
			`}</style>

			<div className="max-w-3xl mx-auto p-8">
				{/* Header */}
				<div className="flex items-start justify-between mb-6">
					<div>
						<h1 className="heading text-2xl">BoraBond Statement</h1>
						<p className="text-sm text-gray-600">{getMonthName(data.month)} {data.year}</p>
						{customerName && (
							<p className="text-sm text-gray-800 mt-1"><span className="font-medium">Customer Name:</span> {customerName}</p>
						)}
						{customerEmail && (
							<p className="text-sm text-gray-800 mt-1"><span className="font-medium">Email:</span> {customerEmail}</p>
						)}
					</div>
					<div className="text-right text-xs text-gray-600">
						<p>Generated: {new Date(data.created_at).toLocaleString()}</p>
						<p className="badge inline-block mt-1">Customer Copy</p>
					</div>
				</div>

				{/* Period */}
				<div className="grid-2 mb-6 text-sm">
					<div className="p-3 rounded-md border">
						<p className="text-gray-500">Period Start</p>
						<p className="font-medium">{new Date(data.statement_period_start).toLocaleDateString()}</p>
					</div>
					<div className="p-3 rounded-md border">
						<p className="text-gray-500">Period End</p>
						<p className="font-medium">{new Date(data.statement_period_end).toLocaleDateString()}</p>
					</div>
				</div>

				{/* Summary */}
				<div className="grid-2 mb-8">
					<div className="p-4 rounded-md border bg-gray-50">
						<p className="text-gray-600 text-sm">Opening Balance</p>
                        <p className="text-lg font-semibold">{formatUGX(data.opening_balance)}</p>
					</div>
					<div className="p-4 rounded-md border bg-gray-50">
						<p className="text-gray-600 text-sm">Closing Balance</p>
                        <p className="text-lg font-semibold">{formatUGX(data.closing_balance)}</p>
					</div>
					<div className="p-4 rounded-md border">
						<p className="text-gray-600 text-sm">Total Deposits</p>
                        <p className="text-lg font-semibold text-green-700">{formatUGX(data.total_deposits)}</p>
					</div>
					<div className="p-4 rounded-md border">
						<p className="text-gray-600 text-sm">Bond Purchases</p>
                        <p className="text-lg font-semibold text-blue-700">{formatUGX(data.total_bond_purchases)}</p>
					</div>
				</div>

				{/* Transactions */}
				<h2 className="heading text-lg mb-2">Transactions</h2>
				<table className="table">
					<thead>
						<tr className="bg-gray-50">
							<th align="left">Date</th>
							<th align="left">Description</th>
							<th align="right">Amount</th>
						</tr>
					</thead>
					<tbody>
						{data.transactions.map(tx => (
							<tr key={tx.id}>
								<td>{new Date(tx.transaction_date).toLocaleDateString()}</td>
								<td>{tx.description}{tx.bond_name ? ` • ${tx.bond_name}` : ''}{tx.payment_rail ? ` • ${tx.payment_rail}` : ''}</td>
								<td align="right" style={{fontWeight: 600}}>
									{formatUGX(tx.amount)}
								</td>
							</tr>
						))}
					</tbody>
				</table>

				{/* Footer */}
				<div className="mt-8 text-[10px] text-gray-500">
					<p>BoraBond • Professional statement generated for your records.</p>
					<p className="mt-1">If you notice any discrepancy, contact support at info@borabond.com.</p>
				</div>

				<div className="no-print mt-6 flex justify-end">
					<button
						type="button"
						onClick={() => {
							try {
								if (typeof window !== 'undefined') {
									// If there is history to go back to, use router.back(); otherwise, close the tab
									if (window.history.length > 1) {
										router.back()
									} else {
										window.close()
									}
								}
							} catch (e) {
								// Fallback
								if (typeof window !== 'undefined') window.close()
							}
						}}
						className="px-3 py-2 border rounded-md text-sm"
					>
						Close
					</button>
				</div>
			</div>
		</div>
	)
}


