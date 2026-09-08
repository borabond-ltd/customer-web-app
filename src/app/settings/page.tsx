'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/auth-context'
import { Layout } from '@/components/layout'
import ProtectedRoute from '@/components/protected-route'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { User, Mail, Bell, Globe, Moon, Sun, Save, MapPin, Phone, Calendar, Briefcase, Building, Home, FileText, Download, ExternalLink, CreditCard, Shield } from 'lucide-react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ProfilePictureUpload } from '@/components/profile/profile-picture-upload'
import { SettingsSkeleton } from '@/components/settings/settings-skeleton'
import { Skeleton } from '@/components/ui/skeleton'
import { PDFViewerModal } from '@/components/pdf/pdf-viewer-modal'
import { useTheme } from 'next-themes'
import { apiClient } from '@/lib/api-client'
import { toast } from 'sonner'

import { logger } from '@/lib/logger'
export default function SettingsPage() {
  const { user } = useAuth()
  const { theme, setTheme } = useTheme()
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [profileData, setProfileData] = useState({
    first_name: '',
    last_name: '',
    email: '',
    phone: '',
    dob: '',
    gender: '',
    marital_status: '',
    occupation: '',
    employer: '',
    employment_status: '',
    citizenship: '',
    us_tax_residence_status: '',
    profile_picture_url: '',
    display_name: ''
  })
  const [addressData, setAddressData] = useState({
    street: '',
    street2: '',
    city: '',
    subdivision: '',
    postal_code: '',
    country_code: 'US'
  })
  const [settings, setSettings] = useState({
    currency: 'USD',
    notifications: {
      email: true,
      push: false,
      sms: false
    },
    preferences: {
      darkMode: theme === 'dark',
      language: 'en',
      timezone: 'UTC'
    }
  })
  const [agreements, setAgreements] = useState([])
  const [agreementsLoading, setAgreementsLoading] = useState(false)
  const [activeTab, setActiveTab] = useState('profile')
  
  // PDF Viewer state
  const [isPDFViewerOpen, setIsPDFViewerOpen] = useState(false)
  const [selectedPDF, setSelectedPDF] = useState<{
    url: string
    title: string
    fileName: string
  } | null>(null)

  // Fetch profile data on component mount
  useEffect(() => {
    const fetchProfileData = async () => {
      try {
        setLoading(true)

        const response = await apiClient.getUserProfile()
        
        if (response.success) {
          const profileData = (response as any).profile || {}
          logger.log('Profile data loaded:', profileData)
          logger.log('Profile picture URL:', profileData.profile_picture_url)
          setProfileData(profileData)
          setAddressData((response as any).address || {})
        } else {
          toast.error('Failed to load profile data')
        }
      } catch (error) {
        logger.error('Error fetching profile:', error)
        toast.error('Failed to load profile data')
      } finally {
        setLoading(false)
      }
    }

    fetchProfileData()
  }, [user])

  // Fetch agreements when agreements tab is accessed
  useEffect(() => {
    if (activeTab === 'agreements') {
      fetchAgreements()
    }
  }, [activeTab])

  const handleProfileChange = (field: string, value: string) => {
    setProfileData(prev => ({
      ...prev,
      [field]: value
    }))
  }

  const handleAddressChange = (field: string, value: string) => {
    setAddressData(prev => ({
      ...prev,
      [field]: value
    }))
  }

  const handleProfilePictureUpdate = (newUrl: string | null) => {
    setProfileData(prev => ({
      ...prev,
      profile_picture_url: newUrl || ''
    }))
  }

  const handleSettingChange = (category: string, key: string, value: any) => {
    setSettings(prev => ({
      ...prev,
      [category]: {
        ...(typeof (prev as any)[category] === 'object' && (prev as any)[category] !== null ? (prev as any)[category] : {}),
        [key]: value
      }
    }))
  }

  const handleSaveProfile = async () => {
    try {
      setSaving(true)
      
      // Create a copy of profileData without email and phone (these shouldn't be updated)
      const { email, phone, ...updatableProfileData } = profileData
      
      const response = await apiClient.updateUserProfile({
        profile: updatableProfileData,
        address: addressData
      })

      if (response.success) {
        toast.success('Profile updated successfully!')
      } else {
        // Show specific validation errors if available
        if ((response as any).details && Array.isArray((response as any).details)) {
          const errorMessage = (response as any).details.join(', ')
          toast.error(`Validation failed: ${errorMessage}`)
        } else {
          toast.error(response.error || 'Failed to update profile')
        }
      }
    } catch (error) {
      logger.error('Error updating profile:', error)
      toast.error('Failed to update profile')
    } finally {
      setSaving(false)
    }
  }

  const handleSaveSettings = () => {
    // Here you would typically save to your backend
    logger.log('Saving settings:', settings)
    toast.success('Settings saved successfully!')
  }

  const fetchAgreements = async () => {
    try {
      setAgreementsLoading(true)
      const response = await apiClient.getUserAgreements()
      
      if (response.success) {
        setAgreements(response.data || [])
      } else {
        toast.error('Failed to load agreements')
      }
    } catch (error) {
      logger.error('Error fetching agreements:', error)
      toast.error('Failed to load agreements')
    } finally {
      setAgreementsLoading(false)
    }
  }

  const handleViewAgreement = (agreement: any) => {
    if (agreement.fileUrl) {
      setSelectedPDF({
        url: agreement.fileUrl,
        title: agreement.title || 'Signed Advisory Agreement',
        fileName: `${agreement.title || 'agreement'}.pdf`
      })
      setIsPDFViewerOpen(true)
    } else {
      toast.error('Document URL not available')
    }
  }

  const handleDownloadAgreement = (agreement: any) => {
    if (agreement.fileUrl) {
      try {
        // Create a temporary link to download the PDF
        const link = document.createElement('a')
        link.href = agreement.fileUrl
        link.download = `${agreement.title || 'agreement'}.pdf`
        link.target = '_blank'
        link.rel = 'noopener noreferrer'
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
        toast.success('Download started')
      } catch (error) {
        logger.error('Download error:', error)
        toast.error('Failed to download document')
      }
    } else {
      toast.error('Document URL not available')
    }
  }

  const handleTabChange = (tab: string) => {
    setActiveTab(tab)
  }

  const handleManageBanks = () => {
    router.push('/dashboard/bank')
  }

  const handleVerifyIdentity = () => {
    router.push('/dashboard/verify-identity')
  }

  if (loading) {
    return (
      <ProtectedRoute>
        <Layout>
          <SettingsSkeleton />
        </Layout>
      </ProtectedRoute>
    )
  }

  return (
    <ProtectedRoute>
      <Layout>
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
            {/* Horizontal Tabbed Interface */}
            <Tabs defaultValue="profile" value={activeTab} onValueChange={setActiveTab} className="space-y-4 sm:space-y-6">
              <TabsList className="grid w-full grid-cols-2 sm:grid-cols-3 lg:grid-cols-7 h-auto p-1 bg-gray-100 dark:bg-gray-800 overflow-x-auto">
                <TabsTrigger 
                  value="profile" 
                  className="flex flex-col sm:flex-row items-center space-y-1 sm:space-y-0 sm:space-x-2 px-2 sm:px-3 py-2 sm:py-3 text-xs sm:text-sm min-w-0"
                >
                  <User className="h-4 w-4 flex-shrink-0" />
                  <span className="hidden sm:inline truncate">Profile</span>
                </TabsTrigger>
                <TabsTrigger 
                  value="address" 
                  className="flex flex-col sm:flex-row items-center space-y-1 sm:space-y-0 sm:space-x-2 px-2 sm:px-3 py-2 sm:py-3 text-xs sm:text-sm min-w-0"
                >
                  <Home className="h-4 w-4 flex-shrink-0" />
                  <span className="hidden sm:inline truncate">Address</span>
                </TabsTrigger>
                <TabsTrigger 
                  value="preferences" 
                  className="flex flex-col sm:flex-row items-center space-y-1 sm:space-y-0 sm:space-x-2 px-2 sm:px-3 py-2 sm:py-3 text-xs sm:text-sm min-w-0"
                >
                  <Globe className="h-4 w-4 flex-shrink-0" />
                  <span className="hidden sm:inline truncate">Preferences</span>
                </TabsTrigger>
                <TabsTrigger 
                  value="agreements" 
                  className="flex flex-col sm:flex-row items-center space-y-1 sm:space-y-0 sm:space-x-2 px-2 sm:px-3 py-2 sm:py-3 text-xs sm:text-sm min-w-0"
                >
                  <FileText className="h-4 w-4 flex-shrink-0" />
                  <span className="hidden sm:inline truncate">Agreements</span>
                </TabsTrigger>
                <TabsTrigger 
                  value="bank-accounts" 
                  className="flex flex-col sm:flex-row items-center space-y-1 sm:space-y-0 sm:space-x-2 px-2 sm:px-3 py-2 sm:py-3 text-xs sm:text-sm min-w-0"
                >
                  <CreditCard className="h-4 w-4 flex-shrink-0" />
                  <span className="hidden sm:inline truncate">Bank Accounts</span>
                </TabsTrigger>
                <TabsTrigger 
                  value="verification" 
                  className="flex flex-col sm:flex-row items-center space-y-1 sm:space-y-0 sm:space-x-2 px-2 sm:px-3 py-2 sm:py-3 text-xs sm:text-sm min-w-0"
                >
                  <Shield className="h-4 w-4 flex-shrink-0" />
                  <span className="hidden sm:inline truncate">Verification</span>
                </TabsTrigger>
                <TabsTrigger 
                  value="security" 
                  className="flex flex-col sm:flex-row items-center space-y-1 sm:space-y-0 sm:space-x-2 px-2 sm:px-3 py-2 sm:py-3 text-xs sm:text-sm min-w-0"
                >
                  <Bell className="h-4 w-4 flex-shrink-0" />
                  <span className="hidden sm:inline truncate">Security</span>
                </TabsTrigger>
              </TabsList>

              {/* Profile Tab */}
              <TabsContent value="profile" className="space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Profile Overview */}
                <div className="lg:col-span-1">
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center space-x-2">
                        <User className="h-5 w-5" />
                        <span>Profile Overview</span>
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="flex flex-col items-center space-y-4">
                        <ProfilePictureUpload
                          currentPictureUrl={profileData.profile_picture_url}
                          userName={profileData.first_name && profileData.last_name 
                            ? `${profileData.first_name} ${profileData.last_name}`
                            : user?.full_name || 'User'
                          }
                          onPictureUpdate={handleProfilePictureUpdate}
                          size="lg"
                        />
                        {profileData.profile_picture_url ? (
                          <p className="text-xs sm:text-sm text-green-600 dark:text-green-400">Existing profile picture detected</p>
                        ) : (
                          <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400">No profile picture set yet</p>
                        )}
                        <div className="text-center">
                          <h3 className="text-lg font-medium">
                            {profileData.first_name && profileData.last_name 
                              ? `${profileData.first_name} ${profileData.last_name}`
                              : user?.full_name || 'User'
                            }
                          </h3>
                          <p className="text-sm text-gray-600 dark:text-gray-400">{profileData.email || user?.email}</p>
                          <Badge variant="secondary" className="mt-2">Borabond Account</Badge>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* Profile Form */}
                <div className="lg:col-span-2">
                  <Card>
                    <CardHeader>
                      <CardTitle>Personal Information</CardTitle>
                      <CardDescription>
                        Update your personal details and contact information
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                      {/* Basic Information */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <Label htmlFor="first-name">First Name</Label>
                          <Input
                            id="first-name"
                            value={profileData.first_name}
                            onChange={(e) => handleProfileChange('first_name', e.target.value)}
                            placeholder="Enter your first name"
                          />
                        </div>
                        
                        <div>
                          <Label htmlFor="last-name">Last Name</Label>
                          <Input
                            id="last-name"
                            value={profileData.last_name}
                            onChange={(e) => handleProfileChange('last_name', e.target.value)}
                            placeholder="Enter your last name"
                          />
                        </div>
                        
                        <div>
                          <Label htmlFor="email">Email Address</Label>
                          <Input
                            id="email"
                            value={profileData.email}
                            placeholder="Enter your email"
                            type="email"
                            disabled
                            className="bg-gray-50 dark:bg-gray-800 cursor-not-allowed"
                          />
                          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                            Email address cannot be changed. Contact support if needed.
                          </p>
                        </div>
                        
                        <div>
                          <Label htmlFor="phone">Phone Number</Label>
                          <Input
                            id="phone"
                            value={profileData.phone}
                            placeholder="Enter your phone number"
                            type="tel"
                            disabled
                            className="bg-gray-50 dark:bg-gray-800 cursor-not-allowed"
                          />
                          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                            Phone number cannot be changed. Contact support if needed.
                          </p>
                        </div>
                        
                        <div>
                          <Label htmlFor="dob">Date of Birth</Label>
                          <Input
                            id="dob"
                            value={profileData.dob}
                            onChange={(e) => handleProfileChange('dob', e.target.value)}
                            type="date"
                          />
                        </div>
                        
                        <div>
                          <Label htmlFor="gender">Gender</Label>
                          <Select
                            value={profileData.gender}
                            onValueChange={(value) => handleProfileChange('gender', value)}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Select gender" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="male">Male</SelectItem>
                              <SelectItem value="female">Female</SelectItem>
                              <SelectItem value="other">Other</SelectItem>
                              <SelectItem value="prefer-not-to-say">Prefer not to say</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>

                      {/* Employment Information */}
                      <div className="space-y-4">
                        <h4 className="text-lg font-medium flex items-center space-x-2">
                          <Briefcase className="h-4 w-4" />
                          <span>Employment Information</span>
                        </h4>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <Label htmlFor="occupation">Occupation</Label>
                            <Input
                              id="occupation"
                              value={profileData.occupation}
                              onChange={(e) => handleProfileChange('occupation', e.target.value)}
                              placeholder="Enter your occupation"
                            />
                          </div>
                          
                          <div>
                            <Label htmlFor="employer">Employer</Label>
                            <Input
                              id="employer"
                              value={profileData.employer}
                              onChange={(e) => handleProfileChange('employer', e.target.value)}
                              placeholder="Enter your employer"
                            />
                          </div>
                          
                          <div>
                            <Label htmlFor="employment-status">Employment Status</Label>
                            <Select
                              value={profileData.employment_status}
                              onValueChange={(value) => handleProfileChange('employment_status', value)}
                            >
                              <SelectTrigger>
                                <SelectValue placeholder="Select employment status" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="employed">Employed</SelectItem>
                                <SelectItem value="self-employed">Self-employed</SelectItem>
                                <SelectItem value="unemployed">Unemployed</SelectItem>
                                <SelectItem value="retired">Retired</SelectItem>
                                <SelectItem value="student">Student</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          
                          <div>
                            <Label htmlFor="marital-status">Marital Status</Label>
                            <Select
                              value={profileData.marital_status}
                              onValueChange={(value) => handleProfileChange('marital_status', value)}
                            >
                              <SelectTrigger>
                                <SelectValue placeholder="Select marital status" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="single">Single</SelectItem>
                                <SelectItem value="married">Married</SelectItem>
                                <SelectItem value="divorced">Divorced</SelectItem>
                                <SelectItem value="widowed">Widowed</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                      </div>

                      {/* Save Profile Button */}
                      <div className="flex justify-end pt-4 border-t">
                        <Button 
                          onClick={handleSaveProfile} 
                          disabled={saving}
                          className="min-w-[120px]"
                        >
                          {saving ? (
                            <div className="flex items-center space-x-2">
                              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                              <span>Saving...</span>
                            </div>
                          ) : (
                            <>
                              <Save className="w-4 h-4 mr-2" />
                              Save Profile
                            </>
                          )}
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </div>
            </TabsContent>

            {/* Address Tab */}
            <TabsContent value="address" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <Home className="h-5 w-5" />
                    <span>Address Information</span>
                  </CardTitle>
                  <CardDescription>
                    Update your residential address information
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="md:col-span-2">
                      <Label htmlFor="street">Street Address</Label>
                      <Input
                        id="street"
                        value={addressData.street}
                        onChange={(e) => handleAddressChange('street', e.target.value)}
                        placeholder="Enter your street address"
                      />
                    </div>
                    
                    <div className="md:col-span-2">
                      <Label htmlFor="street2">Street Address 2 (Optional)</Label>
                      <Input
                        id="street2"
                        value={addressData.street2}
                        onChange={(e) => handleAddressChange('street2', e.target.value)}
                        placeholder="Apartment, suite, unit, etc."
                      />
                    </div>
                    
                    <div>
                      <Label htmlFor="city">City</Label>
                      <Input
                        id="city"
                        value={addressData.city}
                        onChange={(e) => handleAddressChange('city', e.target.value)}
                        placeholder="Enter your city"
                      />
                    </div>
                    
                    <div>
                      <Label htmlFor="subdivision">State/Province</Label>
                      <Input
                        id="subdivision"
                        value={addressData.subdivision}
                        onChange={(e) => handleAddressChange('subdivision', e.target.value)}
                        placeholder="Enter your state or province"
                      />
                    </div>
                    
                    <div>
                      <Label htmlFor="postal-code">Postal Code</Label>
                      <Input
                        id="postal-code"
                        value={addressData.postal_code}
                        onChange={(e) => handleAddressChange('postal_code', e.target.value)}
                        placeholder="Enter your postal code"
                      />
                    </div>
                    
                    <div>
                      <Label htmlFor="country-code">Country</Label>
                      <Select
                        value={addressData.country_code}
                        onValueChange={(value) => handleAddressChange('country_code', value)}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="US">United States</SelectItem>
                          <SelectItem value="CA">Canada</SelectItem>
                          <SelectItem value="GB">United Kingdom</SelectItem>
                          <SelectItem value="NG">Nigeria</SelectItem>
                          <SelectItem value="ZA">South Africa</SelectItem>
                          <SelectItem value="GH">Ghana</SelectItem>
                          <SelectItem value="KE">Kenya</SelectItem>
                          <SelectItem value="UG">Uganda</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  
                  <div className="flex justify-end pt-4 border-t">
                    <Button 
                      onClick={handleSaveProfile} 
                      disabled={saving}
                      className="min-w-[120px]"
                    >
                      {saving ? (
                        <div className="flex items-center space-x-2">
                          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                          <span>Saving...</span>
                        </div>
                      ) : (
                        <>
                          <Save className="w-4 h-4 mr-2" />
                          Save Address
                        </>
                      )}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Preferences Tab */}
            <TabsContent value="preferences" className="space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center space-x-2">
                      <Globe className="h-5 w-5" />
                      <span>Investment Preferences</span>
                    </CardTitle>
                    <CardDescription>
                      Configure your investment display preferences
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="currency">Default Currency</Label>
                        <Select
                          value={settings.currency}
                          onValueChange={(value) => handleSettingChange('', 'currency', value)}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="USD">USD - US Dollar</SelectItem>
                            <SelectItem value="EUR">EUR - Euro</SelectItem>
                            <SelectItem value="GBP">GBP - British Pound</SelectItem>
                            <SelectItem value="NGN">NGN - Nigerian Naira</SelectItem>
                            <SelectItem value="ZAR">ZAR - South African Rand</SelectItem>
                            <SelectItem value="GHS">GHS - Ghanaian Cedi</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      
                      <div>
                        <Label htmlFor="language">Language</Label>
                        <Select
                          value={settings.preferences.language}
                          onValueChange={(value) => handleSettingChange('preferences', 'language', value)}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="en">English</SelectItem>
                            <SelectItem value="fr">Français</SelectItem>
                            <SelectItem value="es">Español</SelectItem>
                            <SelectItem value="pt">Português</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      
                      <div>
                        <Label htmlFor="timezone">Timezone</Label>
                        <Select
                          value={settings.preferences.timezone}
                          onValueChange={(value) => handleSettingChange('preferences', 'timezone', value)}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="UTC">UTC</SelectItem>
                            <SelectItem value="EST">Eastern Time</SelectItem>
                            <SelectItem value="PST">Pacific Time</SelectItem>
                            <SelectItem value="GMT">Greenwich Mean Time</SelectItem>
                            <SelectItem value="CET">Central European Time</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center space-x-2">
                      <Bell className="h-5 w-5" />
                      <span>Notification Settings</span>
                    </CardTitle>
                    <CardDescription>
                      Manage your notification preferences
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <div className="space-y-0.5">
                          <Label>Email Notifications</Label>
                          <p className="text-sm text-gray-600 dark:text-gray-400">
                            Receive notifications via email
                          </p>
                        </div>
                        <Switch
                          checked={settings.notifications.email}
                          onCheckedChange={(checked) => handleSettingChange('notifications', 'email', checked)}
                        />
                      </div>
                      
                      <div className="flex items-center justify-between">
                        <div className="space-y-0.5">
                          <Label>Push Notifications</Label>
                          <p className="text-sm text-gray-600 dark:text-gray-400">
                            Receive push notifications
                          </p>
                        </div>
                        <Switch
                          checked={settings.notifications.push}
                          onCheckedChange={(checked) => handleSettingChange('notifications', 'push', checked)}
                        />
                      </div>
                      
                      <div className="flex items-center justify-between">
                        <div className="space-y-0.5">
                          <Label>SMS Notifications</Label>
                          <p className="text-sm text-gray-600 dark:text-gray-400">
                            Receive notifications via SMS
                          </p>
                        </div>
                        <Switch
                          checked={settings.notifications.sms}
                          onCheckedChange={(checked) => handleSettingChange('notifications', 'sms', checked)}
                        />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            {/* Terms and Agreements Tab */}
            <TabsContent value="agreements" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <FileText className="h-5 w-5" />
                    <span>Terms and Agreements</span>
                  </CardTitle>
                  <CardDescription>
                    Here you can access and download the agreements you accepted during onboarding.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {agreementsLoading ? (
                    <div className="flex items-center justify-center py-12">
                      <div className="text-center">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
                        <p className="text-gray-600 dark:text-gray-400">Loading agreements...</p>
                      </div>
                    </div>
                  ) : agreements.length === 0 ? (
                    <div className="text-center py-12">
                      <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                      <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                        No agreements available
                      </h3>
                      <p className="text-gray-600 dark:text-gray-400">
                        No agreements available at the moment.
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {agreements.map((agreement: any) => (
                        <div
                          key={agreement.id}
                          className="flex items-center justify-between p-4 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                        >
                          <div className="flex items-center space-x-3">
                            <div className="flex-shrink-0">
                              <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900 rounded-lg flex items-center justify-center">
                                <FileText className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                              </div>
                            </div>
                            <div className="flex-1 min-w-0">
                              <h4 className="text-sm font-medium text-gray-900 dark:text-white truncate">
                                {agreement.title}
                              </h4>
                              <div className="flex items-center space-x-2 mt-1">
                                <p className="text-xs text-gray-500 dark:text-gray-400">
                                  Version {agreement.version}
                                </p>
                                <span className="text-xs text-gray-400">•</span>
                                <p className="text-xs text-gray-500 dark:text-gray-400">
                                  Accepted {new Date(agreement.createdAt).toLocaleDateString()}
                                </p>
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center space-x-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleViewAgreement(agreement)}
                              className="flex items-center space-x-2"
                            >
                              <ExternalLink className="h-4 w-4" />
                              <span>View</span>
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleDownloadAgreement(agreement)}
                              className="flex items-center space-x-2"
                            >
                              <Download className="h-4 w-4" />
                              <span>Download</span>
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                  
                  {!agreementsLoading && agreements.length > 0 && (
                    <div className="mt-6 pt-4 border-t border-gray-200 dark:border-gray-700">
                      <div className="flex items-center justify-between">
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          {agreements.length} agreement{agreements.length !== 1 ? 's' : ''} available
                        </p>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={fetchAgreements}
                          className="flex items-center space-x-2"
                        >
                          <ExternalLink className="h-4 w-4" />
                          <span>Refresh</span>
                        </Button>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Bank Accounts Tab */}
            <TabsContent value="bank-accounts" className="space-y-6">
              <Card className="border-l-4 border-l-blue-500 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/20 dark:to-indigo-950/20">
                <CardContent className="p-6">
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                    <div className="flex items-center space-x-4">
                      <div className="p-3 bg-blue-100 dark:bg-blue-900/30 rounded-xl">
                        <CreditCard className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                      </div>
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">
                          Manage Bank Accounts
                        </h3>
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          Connect and manage your bank accounts for seamless investing and withdrawals.
                        </p>
                      </div>
                    </div>
                    <Button
                      onClick={handleManageBanks}
                      className="bg-blue-600 hover:bg-blue-700 text-white"
                      size="sm"
                    >
                      <CreditCard className="mr-2 h-4 w-4" />
                      Manage Banks
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Verification Tab */}
            <TabsContent value="verification" className="space-y-6">
              <Card className="border-l-4 border-l-green-500 bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-950/20 dark:to-emerald-950/20">
                <CardContent className="p-6">
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                    <div className="flex items-center space-x-4">
                      <div className="p-3 bg-green-100 dark:bg-green-900/30 rounded-xl">
                        <Shield className="h-6 w-6 text-green-600 dark:text-green-400" />
                      </div>
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">
                          Identity Verification
                        </h3>
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          Complete your identity verification to access all platform features and ensure compliance.
                        </p>
                      </div>
                    </div>
                    <Button
                      onClick={handleVerifyIdentity}
                      className="bg-green-600 hover:bg-green-700 text-white"
                      size="sm"
                    >
                      <Shield className="mr-2 h-4 w-4" />
                      Verify Identity
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Security Tab */}
            <TabsContent value="security" className="space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center space-x-2">
                      <Moon className="h-5 w-5" />
                      <span>Theme Settings</span>
                    </CardTitle>
                    <CardDescription>
                      Customize your application appearance
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label>Dark Mode</Label>
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          Switch between light and dark themes
                        </p>
                      </div>
                      <Switch
                        checked={theme === 'dark'}
                        onCheckedChange={(checked) => setTheme(checked ? 'dark' : 'light')}
                      />
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Account Status</CardTitle>
                    <CardDescription>
                      Your account verification and status information
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label>Email Verification</Label>
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          {user?.is_verified ? 'Verified' : 'Not verified'}
                        </p>
                      </div>
                      <Badge variant={user?.is_verified ? 'default' : 'secondary'}>
                        {user?.is_verified ? 'Verified' : 'Pending'}
                      </Badge>
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label>Onboarding Status</Label>
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          {user?.onboarding_completed ? 'Completed' : 'In progress'}
                        </p>
                      </div>
                      <Badge variant={user?.onboarding_completed ? 'default' : 'secondary'}>
                        {user?.onboarding_completed ? 'Complete' : 'In Progress'}
                      </Badge>
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label>Last Login</Label>
                        <span className="text-sm text-gray-600 dark:text-gray-400">
                          Today
                        </span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </div>

      {/* PDF Viewer Modal */}
      {selectedPDF && (
        <PDFViewerModal
          isOpen={isPDFViewerOpen}
          onClose={() => {
            setIsPDFViewerOpen(false)
            setSelectedPDF(null)
          }}
          pdfUrl={selectedPDF.url}
          title={selectedPDF.title}
          fileName={selectedPDF.fileName}
        />
      )}
    </Layout>
  </ProtectedRoute>
)
}
