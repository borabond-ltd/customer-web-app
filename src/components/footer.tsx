'use client'

import Link from 'next/link'

export function Footer() {
  return (
    <div className="border-t border-gray-200 dark:border-gray-700 pt-6 pb-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="text-sm text-gray-500 dark:text-gray-400">
          © 2025 Borabond. All rights reserved.
        </div>
        <div className="flex flex-wrap gap-4 sm:gap-6">
          {/* <Link 
            href="/privacy-policy" 
            className="text-sm text-gray-500 dark:text-gray-400 hover:text-green-600 dark:hover:text-green-400 transition-colors"
          >
            Privacy Policy
          </Link> */}
          {/* <Link 
            href="/terms-of-service" 
            className="text-sm text-gray-500 dark:text-gray-400 hover:text-green-600 dark:hover:text-green-400 transition-colors"
          >
            Terms of Service
          </Link> */}
          <Link 
            href="/support" 
            className="text-sm text-gray-500 dark:text-gray-400 hover:text-green-600 dark:hover:text-green-400 transition-colors"
          >
            Support
          </Link>
        </div>
      </div>
    </div>
  )
}
