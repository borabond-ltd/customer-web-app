import { NextResponse } from 'next/server'

// Mock insights data
const mockInsights = {
  portfolio_summary: {
    total_investment: 140000,
    total_yield: 8.1,
    average_maturity: 8.2,
    countries_count: 5,
    bonds_count: 5
  },
  performance_metrics: {
    ytd_return: 12.5,
    monthly_income: 3500,
    next_payment_days: 14,
    risk_score: 6.5
  },
  country_breakdown: [
    { country: 'Nigeria', percentage: 35.7, amount: 50000 },
    { country: 'South Africa', percentage: 21.4, amount: 30000 },
    { country: 'Ghana', percentage: 17.9, amount: 25000 },
    { country: 'Kenya', percentage: 10.7, amount: 15000 },
    { country: 'Egypt', percentage: 14.3, amount: 20000 }
  ],
  upcoming_payments: [
    {
      bond_name: 'Ghana 7Y Government Bond',
      payment_date: '2024-07-10',
      amount: 1150,
      days_until: 7
    },
    {
      bond_name: 'Nigeria 10Y Government Bond',
      payment_date: '2024-07-15',
      amount: 2125,
      days_until: 12
    },
    {
      bond_name: 'Egypt 3Y Government Bond',
      payment_date: '2024-08-25',
      amount: 650,
      days_until: 53
    }
  ],
  yield_analysis: {
    highest_yield: { country: 'Kenya', yield: 10.1 },
    lowest_yield: { country: 'Egypt', yield: 6.5 },
    average_yield: 8.1,
    yield_trend: 'increasing'
  }
}

export async function GET() {
  try {
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 100))
    
    return NextResponse.json({
      success: true,
      data: mockInsights
    })
  } catch {
    return NextResponse.json(
      { success: false, error: 'Failed to fetch insights' },
      { status: 500 }
    )
  }
}
