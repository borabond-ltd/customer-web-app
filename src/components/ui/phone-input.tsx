'use client'

import React, { useState, useRef, useEffect, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ChevronDown, Search, Check } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

interface Country {
  code: string
  name: string
  flag: string
  dialCode: string
  format?: string
}

interface PhoneInputProps {
  value?: string
  onChange?: (value: string, countryCode: string, fullNumber: string) => void
  placeholder?: string
  label?: string
  error?: string
  required?: boolean
  className?: string
  id?: string
  allowedCountries?: string[]
  hideHelpText?: boolean // Hide the "Please enter a valid phone number" warning
  helpText?: string // Custom help text message (defaults to "Please enter a valid phone number for {country}")
}

// Comprehensive list of countries with their phone codes and flags
const countries: Country[] = [
  { code: 'US', name: 'United States', flag: '🇺🇸', dialCode: '+1', format: '(XXX) XXX-XXXX' },
  { code: 'CA', name: 'Canada', flag: '🇨🇦', dialCode: '+1', format: '(XXX) XXX-XXXX' },
  { code: 'GB', name: 'United Kingdom', flag: '🇬🇧', dialCode: '+44', format: 'XXXX XXX XXX' },
  { code: 'AU', name: 'Australia', flag: '🇦🇺', dialCode: '+61', format: 'XXXX XXX XXX' },
  { code: 'DE', name: 'Germany', flag: '🇩🇪', dialCode: '+49', format: 'XXX XXXXXXX' },
  { code: 'FR', name: 'France', flag: '🇫🇷', dialCode: '+33', format: 'X XX XX XX XX' },
  { code: 'IT', name: 'Italy', flag: '🇮🇹', dialCode: '+39', format: 'XXX XXX XXXX' },
  { code: 'ES', name: 'Spain', flag: '🇪🇸', dialCode: '+34', format: 'XXX XX XX XX' },
  { code: 'NL', name: 'Netherlands', flag: '🇳🇱', dialCode: '+31', format: 'X XXXX XXXX' },
  { code: 'BE', name: 'Belgium', flag: '🇧🇪', dialCode: '+32', format: 'XXX XX XX XX' },
  { code: 'CH', name: 'Switzerland', flag: '🇨🇭', dialCode: '+41', format: 'XX XXX XX XX' },
  { code: 'AT', name: 'Austria', flag: '🇦🇹', dialCode: '+43', format: 'XXX XXXXXXX' },
  { code: 'SE', name: 'Sweden', flag: '🇸🇪', dialCode: '+46', format: 'XX-XXX XX XX' },
  { code: 'NO', name: 'Norway', flag: '🇳🇴', dialCode: '+47', format: 'XXX XX XXX' },
  { code: 'DK', name: 'Denmark', flag: '🇩🇰', dialCode: '+45', format: 'XX XX XX XX' },
  { code: 'FI', name: 'Finland', flag: '🇫🇮', dialCode: '+358', format: 'XX XXX XXXX' },
  { code: 'PL', name: 'Poland', flag: '🇵🇱', dialCode: '+48', format: 'XXX XXX XXX' },
  { code: 'CZ', name: 'Czech Republic', flag: '🇨🇿', dialCode: '+420', format: 'XXX XXX XXX' },
  { code: 'HU', name: 'Hungary', flag: '🇭🇺', dialCode: '+36', format: 'XX XXX XXXX' },
  { code: 'RO', name: 'Romania', flag: '🇷🇴', dialCode: '+40', format: 'XXX XXX XXX' },
  { code: 'BG', name: 'Bulgaria', flag: '🇧🇬', dialCode: '+359', format: 'XX XXX XXXX' },
  { code: 'HR', name: 'Croatia', flag: '🇭🇷', dialCode: '+385', format: 'XX XXX XXXX' },
  { code: 'SI', name: 'Slovenia', flag: '🇸🇮', dialCode: '+386', format: 'XX XXX XXX' },
  { code: 'SK', name: 'Slovakia', flag: '🇸🇰', dialCode: '+421', format: 'XXX XXX XXX' },
  { code: 'LT', name: 'Lithuania', flag: '🇱🇹', dialCode: '+370', format: 'XXX XXXXX' },
  { code: 'LV', name: 'Latvia', flag: '🇱🇻', dialCode: '+371', format: 'XXXX XXXX' },
  { code: 'EE', name: 'Estonia', flag: '🇪🇪', dialCode: '+372', format: 'XXXX XXXX' },
  { code: 'IE', name: 'Ireland', flag: '🇮🇪', dialCode: '+353', format: 'XX XXX XXXX' },
  { code: 'PT', name: 'Portugal', flag: '🇵🇹', dialCode: '+351', format: 'XXX XXX XXX' },
  { code: 'GR', name: 'Greece', flag: '🇬🇷', dialCode: '+30', format: 'XXX XXX XXXX' },
  { code: 'CY', name: 'Cyprus', flag: '🇨🇾', dialCode: '+357', format: 'XX XXX XXX' },
  { code: 'MT', name: 'Malta', flag: '🇲🇹', dialCode: '+356', format: 'XXXX XXXX' },
  { code: 'LU', name: 'Luxembourg', flag: '🇱🇺', dialCode: '+352', format: 'XXX XXX XXX' },
  { code: 'IS', name: 'Iceland', flag: '🇮🇸', dialCode: '+354', format: 'XXX XXXX' },
  { code: 'LI', name: 'Liechtenstein', flag: '🇱🇮', dialCode: '+423', format: 'XXX XXX XXX' },
  { code: 'MC', name: 'Monaco', flag: '🇲🇨', dialCode: '+377', format: 'XX XX XX XX' },
  { code: 'SM', name: 'San Marino', flag: '🇸🇲', dialCode: '+378', format: 'XXXX XXXX' },
  { code: 'VA', name: 'Vatican City', flag: '🇻🇦', dialCode: '+379', format: 'XXXX XXXX' },
  { code: 'AD', name: 'Andorra', flag: '🇦🇩', dialCode: '+376', format: 'XXX XXX' },
  { code: 'JP', name: 'Japan', flag: '🇯🇵', dialCode: '+81', format: 'XX-XXXX-XXXX' },
  { code: 'KR', name: 'South Korea', flag: '🇰🇷', dialCode: '+82', format: 'XX-XXXX-XXXX' },
  { code: 'CN', name: 'China', flag: '🇨🇳', dialCode: '+86', format: 'XXX XXXX XXXX' },
  { code: 'IN', name: 'India', flag: '🇮🇳', dialCode: '+91', format: 'XXXXX XXXXX' },
  { code: 'SG', name: 'Singapore', flag: '🇸🇬', dialCode: '+65', format: 'XXXX XXXX' },
  { code: 'HK', name: 'Hong Kong', flag: '🇭🇰', dialCode: '+852', format: 'XXXX XXXX' },
  { code: 'TW', name: 'Taiwan', flag: '🇹🇼', dialCode: '+886', format: 'XX XXXX XXXX' },
  { code: 'TH', name: 'Thailand', flag: '🇹🇭', dialCode: '+66', format: 'XX XXX XXXX' },
  { code: 'MY', name: 'Malaysia', flag: '🇲🇾', dialCode: '+60', format: 'XX-XXXX XXXX' },
  { code: 'ID', name: 'Indonesia', flag: '🇮🇩', dialCode: '+62', format: 'XXX-XXXX-XXXX' },
  { code: 'PH', name: 'Philippines', flag: '🇵🇭', dialCode: '+63', format: 'XXX XXX XXXX' },
  { code: 'VN', name: 'Vietnam', flag: '🇻🇳', dialCode: '+84', format: 'XXX XXX XXXX' },
  { code: 'BR', name: 'Brazil', flag: '🇧🇷', dialCode: '+55', format: '(XX) XXXXX-XXXX' },
  { code: 'AR', name: 'Argentina', flag: '🇦🇷', dialCode: '+54', format: 'XX XXXX-XXXX' },
  { code: 'MX', name: 'Mexico', flag: '🇲🇽', dialCode: '+52', format: 'XX XXXX XXXX' },
  { code: 'CL', name: 'Chile', flag: '🇨🇱', dialCode: '+56', format: 'X XXXX XXXX' },
  { code: 'CO', name: 'Colombia', flag: '🇨🇴', dialCode: '+57', format: 'XXX XXX XXXX' },
  { code: 'PE', name: 'Peru', flag: '🇵🇪', dialCode: '+51', format: 'XXX XXX XXX' },
  { code: 'VE', name: 'Venezuela', flag: '🇻🇪', dialCode: '+58', format: 'XXX-XXX-XXXX' },
  { code: 'EC', name: 'Ecuador', flag: '🇪🇨', dialCode: '+593', format: 'XX XXX XXXX' },
  { code: 'UY', name: 'Uruguay', flag: '🇺🇾', dialCode: '+598', format: 'XXXX XXXX' },
  { code: 'PY', name: 'Paraguay', flag: '🇵🇾', dialCode: '+595', format: 'XXX XXX XXX' },
  { code: 'BO', name: 'Bolivia', flag: '🇧🇴', dialCode: '+591', format: 'XXX XXX XXX' },
  { code: 'GY', name: 'Guyana', flag: '🇬🇾', dialCode: '+592', format: 'XXX XXXX' },
  { code: 'SR', name: 'Suriname', flag: '🇸🇷', dialCode: '+597', format: 'XXX XXXX' },
  { code: 'ZA', name: 'South Africa', flag: '🇿🇦', dialCode: '+27', format: 'XX XXX XXXX' },
  { code: 'NG', name: 'Nigeria', flag: '🇳🇬', dialCode: '+234', format: 'XXX XXX XXXX' },
  { code: 'KE', name: 'Kenya', flag: '🇰🇪', dialCode: '+254', format: 'XXX XXX XXX' },
  { code: 'GH', name: 'Ghana', flag: '🇬🇭', dialCode: '+233', format: 'XX XXX XXXX' },
  { code: 'EG', name: 'Egypt', flag: '🇪🇬', dialCode: '+20', format: 'XX XXXX XXXX' },
  { code: 'MA', name: 'Morocco', flag: '🇲🇦', dialCode: '+212', format: 'XX-XXXX-XXXX' },
  { code: 'TN', name: 'Tunisia', flag: '🇹🇳', dialCode: '+216', format: 'XX XXX XXX' },
  { code: 'DZ', name: 'Algeria', flag: '🇩🇿', dialCode: '+213', format: 'XX XXX XXXX' },
  { code: 'LY', name: 'Libya', flag: '🇱🇾', dialCode: '+218', format: 'XX-XXX-XXXX' },
  { code: 'SD', name: 'Sudan', flag: '🇸🇩', dialCode: '+249', format: 'XX XXX XXXX' },
  { code: 'ET', name: 'Ethiopia', flag: '🇪🇹', dialCode: '+251', format: 'XX XXX XXXX' },
  { code: 'UG', name: 'Uganda', flag: '🇺🇬', dialCode: '+256', format: 'XXX XXX XXX' },
  { code: 'TZ', name: 'Tanzania', flag: '🇹🇿', dialCode: '+255', format: 'XX XXX XXXX' },
  { code: 'RW', name: 'Rwanda', flag: '🇷🇼', dialCode: '+250', format: 'XXX XXX XXX' },
  { code: 'BI', name: 'Burundi', flag: '🇧🇮', dialCode: '+257', format: 'XX XX XX XX' },
  { code: 'DJ', name: 'Djibouti', flag: '🇩🇯', dialCode: '+253', format: 'XX XX XX XX' },
  { code: 'SO', name: 'Somalia', flag: '🇸🇴', dialCode: '+252', format: 'XX XXX XXX' },
  { code: 'ER', name: 'Eritrea', flag: '🇪🇷', dialCode: '+291', format: 'X XXX XXX' },
  { code: 'SS', name: 'South Sudan', flag: '🇸🇸', dialCode: '+211', format: 'XX XXX XXXX' },
  { code: 'CF', name: 'Central African Republic', flag: '🇨🇫', dialCode: '+236', format: 'XX XX XX XX' },
  { code: 'TD', name: 'Chad', flag: '🇹🇩', dialCode: '+235', format: 'XX XX XX XX' },
  { code: 'CM', name: 'Cameroon', flag: '🇨🇲', dialCode: '+237', format: 'XXXX XXXX' },
  { code: 'NE', name: 'Niger', flag: '🇳🇪', dialCode: '+227', format: 'XX XX XX XX' },
  { code: 'BF', name: 'Burkina Faso', flag: '🇧🇫', dialCode: '+226', format: 'XX XX XX XX' },
  { code: 'ML', name: 'Mali', flag: '🇲🇱', dialCode: '+223', format: 'XX XX XX XX' },
  { code: 'SN', name: 'Senegal', flag: '🇸🇳', dialCode: '+221', format: 'XX XXX XX XX' },
  { code: 'GM', name: 'Gambia', flag: '🇬🇲', dialCode: '+220', format: 'XXX XXXX' },
  { code: 'GW', name: 'Guinea-Bissau', flag: '🇬🇼', dialCode: '+245', format: 'XXX XXXX' },
  { code: 'GN', name: 'Guinea', flag: '🇬🇳', dialCode: '+224', format: 'XXX XXX XXX' },
  { code: 'SL', name: 'Sierra Leone', flag: '🇸🇱', dialCode: '+232', format: 'XX XXX XXX' },
  { code: 'LR', name: 'Liberia', flag: '🇱🇷', dialCode: '+231', format: 'XXX XXX XXXX' },
  { code: 'CI', name: 'Côte d\'Ivoire', flag: '🇨🇮', dialCode: '+225', format: 'XX XX XX XX' },
  { code: 'TG', name: 'Togo', flag: '🇹🇬', dialCode: '+228', format: 'XX XXX XXX' },
  { code: 'BJ', name: 'Benin', flag: '🇧🇯', dialCode: '+229', format: 'XX XX XX XX' },
  { code: 'RU', name: 'Russia', flag: '🇷🇺', dialCode: '+7', format: 'XXX XXX-XX-XX' },
  { code: 'KZ', name: 'Kazakhstan', flag: '🇰🇿', dialCode: '+7', format: 'XXX XXX-XX-XX' },
  { code: 'UZ', name: 'Uzbekistan', flag: '🇺🇿', dialCode: '+998', format: 'XX XXX XX XX' },
  { code: 'TM', name: 'Turkmenistan', flag: '🇹🇲', dialCode: '+993', format: 'XX XX-XX-XX' },
  { code: 'TJ', name: 'Tajikistan', flag: '🇹🇯', dialCode: '+992', format: 'XX XXX XXXX' },
  { code: 'KG', name: 'Kyrgyzstan', flag: '🇰🇬', dialCode: '+996', format: 'XXX XXX XXX' },
  { code: 'AF', name: 'Afghanistan', flag: '🇦🇫', dialCode: '+93', format: 'XX XXX XXXX' },
  { code: 'PK', name: 'Pakistan', flag: '🇵🇰', dialCode: '+92', format: 'XXX XXX XXXX' },
  { code: 'BD', name: 'Bangladesh', flag: '🇧🇩', dialCode: '+880', format: 'XXXX-XXXXXX' },
  { code: 'LK', name: 'Sri Lanka', flag: '🇱🇰', dialCode: '+94', format: 'XX XXX XXXX' },
  { code: 'MV', name: 'Maldives', flag: '🇲🇻', dialCode: '+960', format: 'XXX-XXXX' },
  { code: 'BT', name: 'Bhutan', flag: '🇧🇹', dialCode: '+975', format: 'XX XXX XXX' },
  { code: 'NP', name: 'Nepal', flag: '🇳🇵', dialCode: '+977', format: 'XX-XXXXXXX' },
  { code: 'MM', name: 'Myanmar', flag: '🇲🇲', dialCode: '+95', format: 'XX XXX XXXX' },
  { code: 'LA', name: 'Laos', flag: '🇱🇦', dialCode: '+856', format: 'XX XXX XXX' },
  { code: 'KH', name: 'Cambodia', flag: '🇰🇭', dialCode: '+855', format: 'XX XXX XXX' },
  { code: 'BN', name: 'Brunei', flag: '🇧🇳', dialCode: '+673', format: 'XXX XXXX' },
  { code: 'TL', name: 'East Timor', flag: '🇹🇱', dialCode: '+670', format: 'XXX XXXX' },
  { code: 'MN', name: 'Mongolia', flag: '🇲🇳', dialCode: '+976', format: 'XXXX XXXX' },
  { code: 'KP', name: 'North Korea', flag: '🇰🇵', dialCode: '+850', format: 'XXX XXX XXXX' },
  { code: 'NZ', name: 'New Zealand', flag: '🇳🇿', dialCode: '+64', format: 'XX XXX XXXX' },
  { code: 'FJ', name: 'Fiji', flag: '🇫🇯', dialCode: '+679', format: 'XXX XXXX' },
  { code: 'PG', name: 'Papua New Guinea', flag: '🇵🇬', dialCode: '+675', format: 'XXX XXXX' },
  { code: 'SB', name: 'Solomon Islands', flag: '🇸🇧', dialCode: '+677', format: 'XXXXX' },
  { code: 'VU', name: 'Vanuatu', flag: '🇻🇺', dialCode: '+678', format: 'XXXXX' },
  { code: 'NC', name: 'New Caledonia', flag: '🇳🇨', dialCode: '+687', format: 'XX XX XX' },
  { code: 'PF', name: 'French Polynesia', flag: '🇵🇫', dialCode: '+689', format: 'XX XX XX' },
  { code: 'WS', name: 'Samoa', flag: '🇼🇸', dialCode: '+685', format: 'XXXX' },
  { code: 'TO', name: 'Tonga', flag: '🇹🇴', dialCode: '+676', format: 'XXXXX' },
  { code: 'KI', name: 'Kiribati', flag: '🇰🇮', dialCode: '+686', format: 'XXXXX' },
  { code: 'TV', name: 'Tuvalu', flag: '🇹🇻', dialCode: '+688', format: 'XXXX' },
  { code: 'NR', name: 'Nauru', flag: '🇳🇷', dialCode: '+674', format: 'XXX XXXX' },
  { code: 'PW', name: 'Palau', flag: '🇵🇼', dialCode: '+680', format: 'XXX XXXX' },
  { code: 'FM', name: 'Micronesia', flag: '🇫🇲', dialCode: '+691', format: 'XXX XXXX' },
  { code: 'MH', name: 'Marshall Islands', flag: '🇲🇭', dialCode: '+692', format: 'XXX XXXX' },
  { code: 'IL', name: 'Israel', flag: '🇮🇱', dialCode: '+972', format: 'XX-XXX-XXXX' },
  { code: 'PS', name: 'Palestine', flag: '🇵🇸', dialCode: '+970', format: 'XX XXX XXXX' },
  { code: 'JO', name: 'Jordan', flag: '🇯🇴', dialCode: '+962', format: 'XX XXX XXXX' },
  { code: 'LB', name: 'Lebanon', flag: '🇱🇧', dialCode: '+961', format: 'XX XXX XXX' },
  { code: 'SY', name: 'Syria', flag: '🇸🇾', dialCode: '+963', format: 'XX XXX XXXX' },
  { code: 'IQ', name: 'Iraq', flag: '🇮🇶', dialCode: '+964', format: 'XX XXX XXXX' },
  { code: 'IR', name: 'Iran', flag: '🇮🇷', dialCode: '+98', format: 'XXX XXX XXXX' },
  { code: 'TR', name: 'Turkey', flag: '🇹🇷', dialCode: '+90', format: 'XXX XXX XX XX' },
  { code: 'GE', name: 'Georgia', flag: '🇬🇪', dialCode: '+995', format: 'XXX XXX XXX' },
  { code: 'AM', name: 'Armenia', flag: '🇦🇲', dialCode: '+374', format: 'XX XXX XXX' },
  { code: 'AZ', name: 'Azerbaijan', flag: '🇦🇿', dialCode: '+994', format: 'XX XXX XX XX' },
  { code: 'SA', name: 'Saudi Arabia', flag: '🇸🇦', dialCode: '+966', format: 'XX XXX XXXX' },
  { code: 'AE', name: 'United Arab Emirates', flag: '🇦🇪', dialCode: '+971', format: 'XX XXX XXXX' },
  { code: 'QA', name: 'Qatar', flag: '🇶🇦', dialCode: '+974', format: 'XXXX XXXX' },
  { code: 'BH', name: 'Bahrain', flag: '🇧🇭', dialCode: '+973', format: 'XXXX XXXX' },
  { code: 'KW', name: 'Kuwait', flag: '🇰🇼', dialCode: '+965', format: 'XXXX XXXX' },
  { code: 'OM', name: 'Oman', flag: '🇴🇲', dialCode: '+968', format: 'XXXX XXXX' },
  { code: 'YE', name: 'Yemen', flag: '🇾🇪', dialCode: '+967', format: 'XXX XXX XXX' },
]

export function PhoneInput({
  value = '',
  onChange,
  placeholder = 'Enter phone number',
  label,
  error,
  required = false,
  className,
  id,
  allowedCountries,
  hideHelpText = false,
  helpText
}: PhoneInputProps) {
  const availableCountries = useMemo(() => {
    if (allowedCountries && allowedCountries.length > 0) {
      const filtered = countries.filter(country => allowedCountries.includes(country.code))
      return filtered.length > 0 ? filtered : countries
    }
    return countries
  }, [allowedCountries])

  const [selectedCountry, setSelectedCountry] = useState<Country>(availableCountries[0])
  const [phoneNumber, setPhoneNumber] = useState('')
  const [isOpen, setIsOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [filteredCountries, setFilteredCountries] = useState(availableCountries)
  
  const dropdownRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  // Parse existing value to extract country and number
  useEffect(() => {
    if (value) {
      // Try to find country by dial code
      const country = availableCountries.find(c => value.startsWith(c.dialCode))
      if (country) {
        setSelectedCountry(country)
        setPhoneNumber(value.replace(country.dialCode, '').trim())
      } else {
        // If no country code found, assume it's just the number
        setPhoneNumber(value)
      }
    }
  }, [value, availableCountries])

  // Filter countries based on search
  useEffect(() => {
    if (searchQuery && searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim()
      const filtered = availableCountries.filter(country =>
        country.name.toLowerCase().includes(query) ||
        country.code.toLowerCase().includes(query) ||
        country.dialCode.includes(query)
      )
      // Sort results to prioritize exact matches and name matches
      const sorted = filtered.sort((a, b) => {
        const aName = a.name.toLowerCase()
        const bName = b.name.toLowerCase()
        
        // Exact name match first
        if (aName === query) return -1
        if (bName === query) return 1
        
        // Name starts with query
        if (aName.startsWith(query) && !bName.startsWith(query)) return -1
        if (bName.startsWith(query) && !aName.startsWith(query)) return 1
        
        // Alphabetical order for remaining matches
        return aName.localeCompare(bName)
      })
      setFilteredCountries(sorted)
    } else {
      setFilteredCountries(availableCountries)
    }
  }, [searchQuery, availableCountries])

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false)
        setSearchQuery('')
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleCountrySelect = (country: Country) => {
    setSelectedCountry(country)
    setIsOpen(false)
    setSearchQuery('')
    inputRef.current?.focus()
    
    // Notify parent with full number
    const fullNumber = country.dialCode + phoneNumber
    onChange?.(phoneNumber, country.code, fullNumber)
  }

  const handleDropdownToggle = () => {
    setIsOpen(!isOpen)
    if (!isOpen) {
      setSearchQuery('') // Clear search when opening
    }
  }

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const input = e.target.value
    // Remove any non-digit characters
    const cleaned = input.replace(/\D/g, '')
    setPhoneNumber(cleaned)
    
    // Notify parent with full number
    const fullNumber = selectedCountry.dialCode + cleaned
    onChange?.(cleaned, selectedCountry.code, fullNumber)
  }

  const formatPhoneNumber = (number: string, country: Country) => {
    if (!number) return ''
    
    // Simple formatting for common patterns
    const cleaned = number.replace(/\D/g, '')
    
    if (country.code === 'US' || country.code === 'CA') {
      // Format as (XXX) XXX-XXXX
      if (cleaned.length <= 3) return cleaned
      if (cleaned.length <= 6) return `(${cleaned.slice(0, 3)}) ${cleaned.slice(3)}`
      return `(${cleaned.slice(0, 3)}) ${cleaned.slice(3, 6)}-${cleaned.slice(6, 10)}`
    } else if (country.code === 'GB') {
      // Format as XXXX XXX XXX
      if (cleaned.length <= 4) return cleaned
      if (cleaned.length <= 7) return `${cleaned.slice(0, 4)} ${cleaned.slice(4)}`
      return `${cleaned.slice(0, 4)} ${cleaned.slice(4, 7)} ${cleaned.slice(7, 10)}`
    } else if (country.code === 'DE') {
      // Format as XXX XXXXXXX
      if (cleaned.length <= 3) return cleaned
      return `${cleaned.slice(0, 3)} ${cleaned.slice(3)}`
    } else if (country.code === 'FR') {
      // Format as X XX XX XX XX
      if (cleaned.length <= 1) return cleaned
      if (cleaned.length <= 3) return `${cleaned.slice(0, 1)} ${cleaned.slice(1)}`
      if (cleaned.length <= 5) return `${cleaned.slice(0, 1)} ${cleaned.slice(1, 3)} ${cleaned.slice(3)}`
      if (cleaned.length <= 7) return `${cleaned.slice(0, 1)} ${cleaned.slice(1, 3)} ${cleaned.slice(3, 5)} ${cleaned.slice(5)}`
      return `${cleaned.slice(0, 1)} ${cleaned.slice(1, 3)} ${cleaned.slice(3, 5)} ${cleaned.slice(5, 7)} ${cleaned.slice(7)}`
    }
    
    // Default formatting - just return the cleaned number
    return cleaned
  }

  const validatePhoneNumber = (number: string, country: Country) => {
    if (!number) return false
    
    // Basic validation - at least 7 digits for most countries
    const minLength = country.code === 'US' || country.code === 'CA' ? 10 : 7
    return number.length >= minLength
  }

  const isValid = validatePhoneNumber(phoneNumber, selectedCountry)

  return (
    <div className={cn('space-y-2', className)}>
      {label && (
        <Label htmlFor={id} className="text-sm font-medium text-gray-700">
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
        </Label>
      )}
      
      <div className="relative">
        {/* Country Selector */}
        {availableCountries.length > 1 ? (
          <div className="relative" ref={dropdownRef}>
            <Button
              type="button"
              variant="outline"
              className={cn(
                'absolute left-0 top-0 h-10 px-2 border-r border-gray-200 rounded-r-none bg-white hover:bg-gray-50 z-10 flex items-center w-[100px] transition-all duration-200',
                error && 'border-red-500 focus:border-red-500',
                isOpen && 'bg-gray-50 border-gray-300'
              )}
              onClick={handleDropdownToggle}
            >
              <span className="text-sm mr-1">{selectedCountry.flag}</span>
              <span className="text-xs font-medium text-gray-700">{selectedCountry.dialCode}</span>
              <ChevronDown className={cn(
                'ml-1 h-3 w-3 text-gray-400 transition-transform duration-200',
                isOpen && 'rotate-180'
              )} />
            </Button>

            <AnimatePresence>
              {isOpen && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 10 }}
                  transition={{ duration: 0.2 }}
                  className="absolute bottom-full left-0 z-50 w-72 sm:w-80 mb-2 bg-white border border-gray-200 rounded-xl shadow-xl max-h-80 overflow-hidden backdrop-blur-sm"
                >
                  {/* Search */}
                  <div className="p-4 border-b border-gray-100">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                      <Input
                        type="text"
                        placeholder="Search countries..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-10 h-9 border-gray-200 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                      />
                    </div>
                  </div>

                  {/* Country List */}
                  <div className="max-h-60 overflow-y-auto" style={{ maxHeight: '240px' }}>
                    {filteredCountries.map((country) => (
                      <button
                        key={country.code}
                        type="button"
                        className={cn(
                          'w-full px-4 py-3 text-left hover:bg-gray-50 flex items-center justify-between transition-colors duration-150',
                          selectedCountry.code === country.code && 'bg-blue-50 text-blue-700 border-l-4 border-blue-500'
                        )}
                        onClick={() => handleCountrySelect(country)}
                      >
                        <div className="flex items-center">
                          <span className="text-xl mr-3">{country.flag}</span>
                          <div>
                            <div className="text-sm font-medium">{country.name}</div>
                            <div className="text-xs text-gray-500">{country.dialCode}</div>
                          </div>
                        </div>
                        {selectedCountry.code === country.code && (
                          <div className="flex items-center justify-center w-5 h-5 bg-blue-100 rounded-full">
                            <Check className="h-3 w-3 text-blue-600" />
                          </div>
                        )}
                      </button>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        ) : (
          <div className="absolute left-0 top-0 h-10 px-3 flex items-center border-r border-gray-200 bg-gray-50 rounded-l-md z-10">
            <span className="text-sm mr-1">{selectedCountry.flag}</span>
            <span className="text-xs font-medium text-gray-700">{selectedCountry.dialCode}</span>
          </div>
        )}

        {/* Phone Input */}
        <div className="relative">
          <Input
            ref={inputRef}
            id={id}
            type="tel"
            value={formatPhoneNumber(phoneNumber, selectedCountry)}
            onChange={handlePhoneChange}
            placeholder={placeholder}
            className={cn(
              'pr-16 h-10 border-gray-200 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all duration-200 text-sm',
              availableCountries.length > 1 ? 'pl-[120px] rounded-r-md' : 'pl-[60px] rounded-md',
              error && 'border-red-500 focus:border-red-500 focus:ring-red-500',
              isValid && phoneNumber && 'border-green-500 focus:border-green-500 focus:ring-green-500'
            )}
          />
          
          {/* Validation Indicator */}
          {phoneNumber && (
            <div className="absolute right-3 top-1/2 transform -translate-y-1/2 z-10">
              {isValid ? (
                <div className="flex items-center justify-center w-5 h-5 bg-green-100 rounded-full">
                  <Check className="h-3 w-3 text-green-600" />
                </div>
              ) : (
                <div className="w-5 h-5 rounded-full border-2 border-gray-300 bg-white" />
              )}
            </div>
          )}
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <motion.div
          initial={{ opacity: 0, y: -5 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-2 p-2 bg-red-50 border border-red-200 rounded-lg"
        >
          <div className="w-4 h-4 rounded-full bg-red-100 flex items-center justify-center">
            <span className="text-red-600 text-xs font-bold">!</span>
          </div>
          <p className="text-sm text-red-700 font-medium">{error}</p>
        </motion.div>
      )}

      {/* Help Text */}
      {!hideHelpText && phoneNumber && !isValid && (
        <motion.div
          initial={{ opacity: 0, y: -5 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-2 p-2 bg-amber-50 border border-amber-200 rounded-lg"
        >
          <div className="w-4 h-4 rounded-full bg-amber-100 flex items-center justify-center">
            <span className="text-amber-600 text-xs font-bold">!</span>
          </div>
          <p className="text-sm text-amber-700">
            {helpText || `Please enter a valid phone number for ${selectedCountry.name}`}
          </p>
        </motion.div>
      )}
      
      {/* Format Example */}
      {!phoneNumber && (
        <div className="flex items-center gap-2 text-xs text-gray-500">
          <div className="w-1 h-1 rounded-full bg-gray-300"></div>
          <span>Example: {selectedCountry.format || 'Enter your phone number'}</span>
        </div>
      )}
    </div>
  )
}
