'use client';

import React, { useState, useEffect } from 'react';
import { Layout } from '@/components/layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Calendar, Download, Eye, FileText } from 'lucide-react';
import { apiClient } from '@/lib/api-client';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { Skeleton } from '@/components/ui/skeleton';

interface Statement {
  id: string;
  month: number;
  year: number;
  statement_period_start: string;
  statement_period_end: string;
  status: 'generated' | 'sent' | 'failed';
  opening_balance: number;
  closing_balance: number;
  total_deposits: number;
  total_bond_purchases: number;
  total_coupon_payouts: number;
  transaction_count: number;
  created_at: string;
  file_url?: string;
}

interface StatementDetails extends Statement {
  transactions: Array<{
    id: string;
    transaction_type: string;
    transaction_date: string;
    amount: number;
    description: string;
    bond_name?: string;
    payment_rail?: string;
  }>;
}

export default function StatementsDashboard() {
  const [statements, setStatements] = useState<Statement[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedStatement, setSelectedStatement] = useState<StatementDetails | null>(null);
  const [generating, setGenerating] = useState(false);
  const [displayCurrency, setDisplayCurrency] = useState<'UGX' | 'USD'>('UGX');
  const [exchangeRate, setExchangeRate] = useState<number>(0); // UGX per USD
  const [rateLoading, setRateLoading] = useState<boolean>(false);
  const [rateError, setRateError] = useState<string | null>(null);

  useEffect(() => {
    fetchStatements();
    // Preload default rate (UGX base for USD conversion)
    loadExchangeRate('UGX');
  }, []);

  const fetchStatements = async () => {
    try {
      setLoading(true);
      const response = await apiClient.getStatements();
      
      if (response.success) {
        const statementsData = response.data.statements || [];
        console.log('Fetched statements:', statementsData.map(s => ({
          id: s.id,
          month: s.month,
          year: s.year,
          total_deposits: s.total_deposits,
          was_converted: s.was_converted,
          exchange_rate: s.exchange_rate
        })));
        setStatements(statementsData);
      } else {
        setError('Failed to fetch statements');
      }
    } catch (err) {
      setError('Error loading statements');
      console.error('Error fetching statements:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadExchangeRate = async (currencyCode: 'UGX' | 'USD') => {
    try {
      setRateLoading(true);
      setRateError(null);
      const res = await apiClient.getExchangeRate(currencyCode);
      if ((res as any)?.success) {
        const r = (res as any).data?.rate_to_usd ?? (res as any).data?.rate ?? (res as any).rate ?? (res as any).data?.exchangeRate;
        if (typeof r === 'number' && r > 0) setExchangeRate(r);
      }
    } catch (e) {
      setRateError('Failed to load exchange rate');
    } finally {
      setRateLoading(false);
    }
  };

  // When user changes currency, refresh the rate as needed
  useEffect(() => {
    if (displayCurrency === 'USD') {
      loadExchangeRate('UGX'); // API returns UGX per USD
    }
  }, [displayCurrency]);

  const fetchStatementDetails = async (statementId: string) => {
    try {
      const response = await apiClient.getStatementDetails(statementId);
      
      if (response.success) {
        setSelectedStatement(response.data);
      } else {
        setError('Failed to fetch statement details');
      }
    } catch (err) {
      setError('Error loading statement details');
      console.error('Error fetching statement details:', err);
    }
  };

  const generateStatement = async (month: number, year: number) => {
    try {
      setGenerating(true);
      const response = await apiClient.generateStatement(month, year, true);
      
      if (response.success) {
        await fetchStatements(); // Refresh the list
        setError(null);
      } else {
        setError(response.message || 'Failed to generate statement');
      }
    } catch (err) {
      setError('Error generating statement');
      console.error('Error generating statement:', err);
    } finally {
      setGenerating(false);
    }
  };


  const getMonthName = (month: number) => {
    const months = [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'
    ];
    return months[month - 1] || 'Unknown';
  };

  const formatAmount = (amountUGX: number) => {
    // Use absolute value to ensure no negative signs are displayed
    const absoluteAmount = Math.abs(amountUGX);
    if (displayCurrency === 'USD') {
      const usd = exchangeRate > 0 ? absoluteAmount / exchangeRate : absoluteAmount;
      return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 2 }).format(usd);
    }
    return `UGX ${Math.round(absoluteAmount).toLocaleString('en-UG')}`;
  };

  const getStatusBadge = (status: string) => {
    const variants = {
      generated: 'default',
      sent: 'default',
      failed: 'destructive'
    } as const;

    return (
      <Badge variant={variants[status as keyof typeof variants] || 'default'}>
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </Badge>
    );
  };

  const getTransactionTypeIcon = (type: string) => {
    switch (type) {
      case 'deposit':
        return '💰';
      case 'bond_purchase':
        return '📈';
      case 'coupon_payout':
        return '💵';
      default:
        return '📄';
    }
  };

  if (loading) {
    return (
      <Layout>
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="space-y-2">
              <Skeleton className="h-8 w-64" />
              <Skeleton className="h-4 w-[36rem] max-w-full" />
            </div>
            <Skeleton className="h-10 w-44" />
          </div>

          <div className="grid gap-6">
            {[1,2,3].map((i) => (
              <Card key={i}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className="space-y-2">
                      <Skeleton className="h-5 w-48" />
                      <Skeleton className="h-4 w-56" />
                    </div>
                    <Skeleton className="h-6 w-20" />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                    {[1,2,3,4].map((k) => (
                      <div key={k} className="text-center space-y-2">
                        <Skeleton className="h-4 w-24 mx-auto" />
                        <Skeleton className="h-5 w-28 mx-auto" />
                      </div>
                    ))}
                  </div>
                  <div className="flex gap-2">
                    <Skeleton className="h-9 w-28" />
                    <Skeleton className="h-9 w-32" />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Monthly Statements</h1>
          <p className="text-gray-600 mt-2">
            View and download your monthly investment statements. Statements are automatically generated and emailed at the end of each month.
          </p>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-600">Currency</span>
            <Select value={displayCurrency} onValueChange={(v: 'UGX' | 'USD') => setDisplayCurrency(v)}>
              <SelectTrigger className="h-9 w-[110px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="UGX">UGX</SelectItem>
                <SelectItem value="USD">USD</SelectItem>
              </SelectContent>
            </Select>
            {displayCurrency === 'USD' && (
              <span className="text-xs text-gray-500">
                {rateLoading ? 'Loading rate…' : exchangeRate ? `1 USD ≈ ${Math.round(exchangeRate).toLocaleString('en-UG')} UGX` : rateError || ''}
              </span>
            )}
          </div>
          {/* Hidden: Send Test Email button */}
          {false && (
            <Button
              variant="outline"
              onClick={async () => {
                try {
                  if (!statements || statements.length === 0) {
                    toast.error('No statements available to email');
                    return;
                  }
                  const target = statements[0];
                  const res = await apiClient.sendStatementEmail(target.id);
                  if ((res as any)?.success) {
                    toast.success('Monthly statement email sent');
                  } else {
                    toast.error((res as any)?.message || 'Failed to send statement email');
                  }
                } catch (e) {
                  toast.error('Error sending statement email');
                }
              }}
            >
              Send Test Email
            </Button>
          )}
          <Button
          onClick={() => {
            const now = new Date();
            const lastMonth = now.getMonth() === 0 ? 12 : now.getMonth();
            const year = now.getMonth() === 0 ? now.getFullYear() - 1 : now.getFullYear();
            generateStatement(lastMonth, year);
          }}
          disabled={generating}
          className="bg-green-600 hover:bg-green-700"
        >
          {generating ? 'Generating...' : 'Generate Last Month'}
          </Button>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-md p-4">
          <p className="text-red-800">{error}</p>
        </div>
      )}

      {statements.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <FileText className="h-12 w-12 text-gray-400 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No statements yet</h3>
            <p className="text-gray-600 text-center mb-4">
              Your monthly statements will appear here once generated. They are automatically created and emailed at the end of each month.
            </p>
            <Button
              onClick={() => {
                const now = new Date();
                const lastMonth = now.getMonth() === 0 ? 12 : now.getMonth();
                const year = now.getMonth() === 0 ? now.getFullYear() - 1 : now.getFullYear();
                generateStatement(lastMonth, year);
              }}
              disabled={generating}
              className="bg-green-600 hover:bg-green-700"
            >
              {generating ? 'Generating...' : 'Generate Statement'}
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6">
          {statements.map((statement) => (
            <Card key={statement.id} className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <Calendar className="h-5 w-5 text-green-600" />
                      {getMonthName(statement.month)} {statement.year}
                    </CardTitle>
                    <CardDescription>
                      {new Date(statement.statement_period_start).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - {' '}
                      {new Date(statement.statement_period_end).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                    </CardDescription>
                  </div>
                  {getStatusBadge(statement.status)}
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                  <div className="text-center">
                    <p className="text-sm text-gray-600">Opening Balance</p>
                    <p className="font-semibold">{formatAmount(statement.opening_balance)}</p>
                  </div>
                  <div className="text-center">
                    <p className="text-sm text-gray-600">Closing Balance</p>
                    <p className="font-semibold">{formatAmount(statement.closing_balance)}</p>
                  </div>
                  <div className="text-center">
                    <p className="text-sm text-gray-600">Total Deposits</p>
                    <p className="font-semibold text-green-600" data-testid={`total-deposits-${statement.id}`}>
                      {formatAmount(statement.total_deposits)}
                    </p>
                    {/* {process.env.NODE_ENV === 'development' && (
                      <p className="text-xs text-gray-400 mt-1">
                        Raw: {statement.total_deposits?.toFixed(2)} {statement.was_converted ? '(converted)' : ''}
                      </p>
                    )} */}
                  </div>
                  <div className="text-center">
                    <p className="text-sm text-gray-600">Transactions</p>
                    <p className="font-semibold">{statement.transaction_count}</p>
                  </div>
                </div>

                <div className="flex flex-wrap gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => fetchStatementDetails(statement.id)}
                  >
                    <Eye className="h-4 w-4 mr-2" />
                    View Details
                  </Button>
                  
                  <Button
                    size="sm"
                    className="bg-green-600 hover:bg-green-700"
                    onClick={() => window.open(`/dashboard/statements/print/${statement.id}`, '_blank')}
                  >
                    <Download className="h-4 w-4 mr-2" />
                    Download PDF
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Statement Details Modal */}
      {selectedStatement && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold">
                  {getMonthName(selectedStatement.month)} {selectedStatement.year} Statement
                </h2>
                <Button
                  variant="outline"
                  onClick={() => setSelectedStatement(null)}
                >
                  Close
                </Button>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                <div className="text-center p-4 bg-gray-50 rounded-lg">
                  <p className="text-sm text-gray-600">Opening Balance</p>
                  <p className="font-semibold text-lg">{formatAmount(selectedStatement.opening_balance)}</p>
                </div>
                <div className="text-center p-4 bg-gray-50 rounded-lg">
                  <p className="text-sm text-gray-600">Closing Balance</p>
                  <p className="font-semibold text-lg">{formatAmount(selectedStatement.closing_balance)}</p>
                </div>
                <div className="text-center p-4 bg-green-50 rounded-lg">
                  <p className="text-sm text-gray-600">Total Deposits</p>
                  <p className="font-semibold text-lg text-green-600">{formatAmount(selectedStatement.total_deposits)}</p>
                </div>
                <div className="text-center p-4 bg-blue-50 rounded-lg">
                  <p className="text-sm text-gray-600">Bond Purchases</p>
                  <p className="font-semibold text-lg text-blue-600">{formatAmount(selectedStatement.total_bond_purchases)}</p>
                </div>
              </div>

              <h3 className="text-lg font-semibold mb-4">Transaction Details</h3>
              <div className="space-y-2">
                {selectedStatement.transactions.map((transaction) => (
                  <div key={transaction.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center gap-3">
                      <span className="text-lg">{getTransactionTypeIcon(transaction.transaction_type)}</span>
                      <div>
                        <p className="font-medium">{transaction.description}</p>
                        <p className="text-sm text-gray-600">
                          {new Date(transaction.transaction_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                          {transaction.bond_name && ` • ${transaction.bond_name}`}
                          {transaction.payment_rail && ` • ${transaction.payment_rail}`}
                        </p>
                      </div>
                    </div>
                    <p className="font-semibold">
                      {formatAmount(transaction.amount)}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
    </Layout>
  );
}
