'use client';

import React from 'react';

interface FormFieldProps {
  label: string;
  required?: boolean;
  error?: string;
  touched?: boolean;
  children: React.ReactNode;
  className?: string;
}

export function FormField({
  label,
  required = false,
  error,
  touched,
  children,
  className = '',
}: FormFieldProps) {
  const showError = touched && error;

  return (
    <div className={`grid grid-cols-3 gap-4 items-start ${className}`}>
      <label className="text-sm font-medium text-gray-700 pt-2">
        {label}
        {required && <span className="text-red-500 ml-1">*</span>}
      </label>
      <div className="col-span-2">
        {children}
        {showError && (
          <p className="mt-1 text-sm text-red-600" role="alert">
            {error}
          </p>
        )}
      </div>
    </div>
  );
}

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  error?: string;
  touched?: boolean;
}

export function Input({ error, touched, className = '', ...props }: InputProps) {
  const showError = touched && error;
  const baseClasses = 'px-4 py-2 border rounded-md focus:outline-none focus:ring-2';
  const errorClasses = showError
    ? 'border-red-500 focus:ring-red-500'
    : 'border-blue-600 focus:ring-blue-500';

  return (
    <input
      className={`${baseClasses} ${errorClasses} ${className}`}
      aria-invalid={showError ? 'true' : 'false'}
      aria-describedby={showError ? `${props.id}-error` : undefined}
      {...props}
    />
  );
}

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  error?: string;
  touched?: boolean;
}

export function Select({ error, touched, className = '', children, ...props }: SelectProps) {
  const showError = touched && error;
  const baseClasses = 'w-full px-4 py-2 border rounded-md focus:outline-none focus:ring-2 appearance-none bg-white';
  const errorClasses = showError
    ? 'border-red-500 focus:ring-red-500'
    : 'border-blue-600 focus:ring-blue-500';

  return (
    <div className="relative">
      <select
        className={`${baseClasses} ${errorClasses} ${className}`}
        aria-invalid={showError ? 'true' : 'false'}
        aria-describedby={showError ? `${props.id}-error` : undefined}
        {...props}
      >
        {children}
      </select>
      <svg
        className="absolute right-3 top-1/2 transform -translate-y-1/2 w-5 h-5 pointer-events-none text-gray-400"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
      </svg>
      {showError && (
        <p id={`${props.id}-error`} className="mt-1 text-sm text-red-600" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}

interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  error?: string;
  touched?: boolean;
}

export function Textarea({ error, touched, className = '', ...props }: TextareaProps) {
  const showError = touched && error;
  const baseClasses = 'px-4 py-2 border rounded-md focus:outline-none focus:ring-2 resize-none';
  const errorClasses = showError
    ? 'border-red-500 focus:ring-red-500'
    : 'border-blue-600 focus:ring-blue-500';

  return (
    <>
      <textarea
        className={`${baseClasses} ${errorClasses} ${className}`}
        aria-invalid={showError ? 'true' : 'false'}
        aria-describedby={showError ? `${props.id}-error` : undefined}
        {...props}
      />
      {showError && (
        <p id={`${props.id}-error`} className="mt-1 text-sm text-red-600" role="alert">
          {error}
        </p>
      )}
    </>
  );
}

