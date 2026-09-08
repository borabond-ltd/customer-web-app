import { NextResponse } from 'next/server'

// Mock bond data
const mockBonds = [
  {
    id: '1',
    country: 'Nigeria',
    bond_name: 'Nigeria 10Y Government Bond',
    maturity_date: '2034-01-15',
    coupon_rate: 8.5,
    principal: 50000,
    yield: 8.2,
    purchase_date: '2024-01-15',
    created_at: '2024-01-15T10:00:00Z'
  },
  {
    id: '2',
    country: 'South Africa',
    bond_name: 'South Africa 5Y Government Bond',
    maturity_date: '2029-03-20',
    coupon_rate: 7.8,
    principal: 30000,
    yield: 7.5,
    purchase_date: '2024-02-01',
    created_at: '2024-02-01T10:00:00Z'
  },
  {
    id: '3',
    country: 'Ghana',
    bond_name: 'Ghana 7Y Government Bond',
    maturity_date: '2031-06-10',
    coupon_rate: 9.2,
    principal: 25000,
    yield: 8.9,
    purchase_date: '2024-01-20',
    created_at: '2024-01-20T10:00:00Z'
  },
  {
    id: '4',
    country: 'Kenya',
    bond_name: 'Kenya 15Y Government Bond',
    maturity_date: '2039-12-15',
    coupon_rate: 10.1,
    principal: 15000,
    yield: 9.8,
    purchase_date: '2024-03-01',
    created_at: '2024-03-01T10:00:00Z'
  },
  {
    id: '5',
    country: 'Egypt',
    bond_name: 'Egypt 3Y Government Bond',
    maturity_date: '2027-08-25',
    coupon_rate: 6.5,
    principal: 20000,
    yield: 6.2,
    purchase_date: '2024-02-15',
    created_at: '2024-02-15T10:00:00Z'
  }
]

export async function GET() {
  try {
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 100))
    
    return NextResponse.json({
      success: true,
      data: mockBonds,
      total: mockBonds.length
    })
  } catch {
    return NextResponse.json(
      { success: false, error: 'Failed to fetch bonds' },
      { status: 500 }
    )
  }
}
