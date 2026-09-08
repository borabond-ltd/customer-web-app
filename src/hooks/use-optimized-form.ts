import { useState, useCallback, useMemo, useRef } from 'react'

// Custom debounce function for better performance
const debounce = <T extends (...args: any[]) => any>(
  func: T,
  wait: number
): ((...args: Parameters<T>) => void) => {
  let timeout: NodeJS.Timeout | null = null
  return (...args: Parameters<T>) => {
    if (timeout) clearTimeout(timeout)
    timeout = setTimeout(() => func(...args), wait)
  }
}

interface FormValidation {
  [key: string]: string
}

interface UseOptimizedFormOptions<T> {
  initialValues: T
  validationFn?: (values: T) => FormValidation
  debounceMs?: number
}

export function useOptimizedForm<T extends Record<string, any>>({
  initialValues,
  validationFn,
  debounceMs = 300
}: UseOptimizedFormOptions<T>) {
  const [values, setValues] = useState<T>(initialValues)
  const [errors, setErrors] = useState<FormValidation>({})
  const [touched, setTouched] = useState<Record<keyof T, boolean>>({} as Record<keyof T, boolean>)
  const [isSubmitting, setIsSubmitting] = useState(false)
  
  // Memoized validation function
  const validate = useCallback((valuesToValidate: T) => {
    if (!validationFn) return {}
    return validationFn(valuesToValidate)
  }, [validationFn])
  
  // Debounced validation
  const debouncedValidate = useMemo(
    () => debounce((valuesToValidate: T) => {
      const newErrors = validate(valuesToValidate)
      setErrors(newErrors)
    }, debounceMs),
    [validate, debounceMs]
  )
  
  // Optimized field update
  const setFieldValue = useCallback((field: keyof T, value: any) => {
    setValues(prev => {
      const newValues = { ...prev, [field]: value }
      debouncedValidate(newValues)
      return newValues
    })
  }, [debouncedValidate])
  
  // Set field as touched
  const setFieldTouched = useCallback((field: keyof T, isTouched: boolean = true) => {
    setTouched(prev => ({ ...prev, [field]: isTouched }))
  }, [])
  
  // Check if form is valid
  const isValid = useMemo(() => Object.keys(errors).length === 0, [errors])
  
  // Check if form has been touched
  const isTouched = useMemo(() => Object.values(touched).some(Boolean), [touched])
  
  // Reset form
  const resetForm = useCallback(() => {
    setValues(initialValues)
    setErrors({})
    setTouched({} as Record<keyof T, boolean>)
    setIsSubmitting(false)
  }, [initialValues])
  
  // Set form errors
  const setFormErrors = useCallback((newErrors: FormValidation) => {
    setErrors(newErrors)
  }, [])
  
  // Clear form errors
  const clearErrors = useCallback(() => {
    setErrors({})
  }, [])
  
  return {
    values,
    errors,
    touched,
    isSubmitting,
    isValid,
    isTouched,
    setFieldValue,
    setFieldTouched,
    setFormErrors,
    clearErrors,
    resetForm,
    setIsSubmitting,
    validate: () => {
      const newErrors = validate(values)
      setErrors(newErrors)
      return Object.keys(newErrors).length === 0
    }
  }
}
