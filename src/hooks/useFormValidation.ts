import { useState, useCallback, useEffect } from 'react';
import { z, ZodSchema } from 'zod';
import { getFieldError } from '@/lib/validation';

export interface UseFormValidationOptions<T> {
  schema: ZodSchema<T>;
  initialValues: Partial<T>;
  onSubmit: (data: T) => Promise<void> | void;
  validateOnChange?: boolean;
  validateOnBlur?: boolean;
}

export interface FormValidationState<T> {
  values: Partial<T>;
  errors: Partial<Record<keyof T, string>>;
  touched: Partial<Record<keyof T, boolean>>;
  isSubmitting: boolean;
  isValid: boolean;
}

export function useFormValidation<T extends Record<string, unknown>>({
  schema,
  initialValues,
  onSubmit,
  validateOnChange = true,
  validateOnBlur = true,
}: UseFormValidationOptions<T>) {
  const [values, setValues] = useState<Partial<T>>(initialValues);
  const [errors, setErrors] = useState<Partial<Record<keyof T, string>>>({});
  const [touched, setTouched] = useState<Partial<Record<keyof T, boolean>>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Validate single field
  const validateField = useCallback(
    (fieldName: keyof T, value: unknown) => {
      try {
        // Validate entire form with updated value
        const updatedValues = { ...values, [fieldName]: value };
        schema.parse(updatedValues);
        setErrors((prev) => {
          const newErrors = { ...prev };
          delete newErrors[fieldName];
          return newErrors;
        });
        return true;
      } catch (error) {
        if (error instanceof z.ZodError && error.errors && Array.isArray(error.errors)) {
          const fieldError = error.errors.find((e) => {
            return e.path && Array.isArray(e.path) && e.path.length > 0 && e.path[0] === fieldName;
          });
          if (fieldError) {
            setErrors((prev) => ({
              ...prev,
              [fieldName]: fieldError.message,
            }));
          } else {
            // Clear error if field is valid
            setErrors((prev) => {
              const newErrors = { ...prev };
              delete newErrors[fieldName];
              return newErrors;
            });
          }
        }
        return false;
      }
    },
    [schema, values]
  );

  // Validate entire form
  const validateForm = useCallback(() => {
    try {
      schema.parse(values);
      setErrors({});
      return true;
    } catch (error) {
      if (error instanceof z.ZodError) {
        const newErrors: Partial<Record<keyof T, string>> = {};
        error.errors.forEach((err) => {
          const fieldName = err.path[0] as keyof T;
          if (fieldName) {
            newErrors[fieldName] = err.message;
          }
        });
        setErrors(newErrors);
      }
      return false;
    }
  }, [schema, values]);

  // Handle field change
  const handleChange = useCallback(
    (fieldName: keyof T) => (value: unknown) => {
      setValues((prev) => ({
        ...prev,
        [fieldName]: value,
      }));

      // Clear error when user starts typing
      if (errors[fieldName]) {
        setErrors((prev) => {
          const newErrors = { ...prev };
          delete newErrors[fieldName];
          return newErrors;
        });
      }

      // Validate on change if enabled
      if (validateOnChange && touched[fieldName]) {
        setTimeout(() => validateField(fieldName, value), 300); // Debounce validation
      }
    },
    [errors, touched, validateOnChange, validateField]
  );

  // Handle field blur
  const handleBlur = useCallback(
    (fieldName: keyof T) => () => {
      setTouched((prev) => ({
        ...prev,
        [fieldName]: true,
      }));

      // Validate on blur if enabled
      if (validateOnBlur) {
        validateField(fieldName, values[fieldName]);
      }
    },
    [validateOnBlur, validateField, values]
  );

  // Handle form submit
  const handleSubmit = useCallback(
    async (e?: React.FormEvent) => {
      e?.preventDefault();

      // Mark all fields as touched
      const allTouched: Partial<Record<keyof T, boolean>> = {};
      Object.keys(values).forEach((key) => {
        allTouched[key as keyof T] = true;
      });
      setTouched(allTouched);

      // Validate form
      if (!validateForm()) {
        return;
      }

      // Submit
      setIsSubmitting(true);
      try {
        await onSubmit(values as T);
      } catch (error) {
        // Handle submit error (can be handled by parent component)
        throw error;
      } finally {
        setIsSubmitting(false);
      }
    },
    [values, validateForm, onSubmit]
  );

  // Reset form
  const reset = useCallback(() => {
    setValues(initialValues);
    setErrors({});
    setTouched({});
    setIsSubmitting(false);
  }, [initialValues]);

  // Set field value manually
  const setValue = useCallback((fieldName: keyof T, value: unknown) => {
    setValues((prev) => ({
      ...prev,
      [fieldName]: value,
    }));
    if (touched[fieldName]) {
      validateField(fieldName, value);
    }
  }, [touched, validateField]);

  // Set field error manually
  const setError = useCallback((fieldName: keyof T, errorMessage: string) => {
    setErrors((prev) => ({
      ...prev,
      [fieldName]: errorMessage,
    }));
  }, []);

  // Check if form is valid
  const isValid = Object.keys(errors).length === 0;

  return {
    values,
    errors,
    touched,
    isSubmitting,
    isValid,
    handleChange,
    handleBlur,
    handleSubmit,
    reset,
    setValue,
    setError,
    validateField,
    validateForm,
  };
}

