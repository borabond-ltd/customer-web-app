'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/auth-context'
import { BankLinkingWizard } from '@/components/bank-linking/bank-linking-wizard'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { ArrowLeft, Shield, CreditCard, Building2 } from 'lucide-react'

export default function BankLinkingPage() {
  const router = useRouter()
  const { isAuthenticated, loading, user } = useAuth()
  const [isReady, setIsReady] = useState(false)

  useEffect(() => {
    if (!loading) {
      if (!isAuthenticated) {
        router.push('/auth/signin')
        return
      }
      setIsReady(true)
    }
  }, [isAuthenticated, loading, router])

  if (loading || !isReady) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-green-600"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <Button
            variant="ghost"
            onClick={() => router.back()}
            className="mb-4"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          
          <div className="text-center">
            <h1 className="text-4xl font-bold text-gray-900 mb-4">
              Connect Your Bank Account
            </h1>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              Securely link your bank account to start investing in bonds with confidence
            </p>
          </div>
        </div>

        {/* Features */}
        <div className="grid md:grid-cols-3 gap-6 mb-12">
          <Card className="text-center">
            <CardHeader>
              <Shield className="h-12 w-12 text-green-600 mx-auto mb-4" />
              <CardTitle>Bank-Level Security</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription>
                Your data is protected with 256-bit encryption and never stored on our servers
              </CardDescription>
            </CardContent>
          </Card>

          <Card className="text-center">
            <CardHeader>
              <CreditCard className="h-12 w-12 text-blue-600 mx-auto mb-4" />
              <CardTitle>Instant Verification</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription>
                Connect your account in seconds with our secure Plaid integration
              </CardDescription>
            </CardContent>
          </Card>

          <Card className="text-center">
            <CardHeader>
              <Building2 className="h-12 w-12 text-purple-600 mx-auto mb-4" />
              <CardTitle>Trusted by Banks</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription>
                Used by thousands of financial institutions worldwide
              </CardDescription>
            </CardContent>
          </Card>
        </div>

        {/* Main Wizard */}
        <div className="max-w-4xl mx-auto">
          {user && <BankLinkingWizard />}
        </div>
      </div>
    </div>
  )
}
