'use client';

import { useState, useCallback, createContext, useContext, type ReactNode } from 'react';
import ConfirmModal from '@/components/common/ConfirmModal';

interface ConfirmOptions {
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  variant?: 'danger' | 'warning' | 'info';
  onConfirm: () => void | Promise<void>;
}

interface ConfirmContextType {
  confirm: (options: ConfirmOptions) => void;
}

const ConfirmContext = createContext<ConfirmContextType | null>(null);

export function ConfirmProvider({ children }: { children: ReactNode }) {
  const [modalState, setModalState] = useState<{
    isOpen: boolean;
    options: ConfirmOptions | null;
  }>({
    isOpen: false,
    options: null,
  });

  const [isLoading, setIsLoading] = useState(false);

  const confirm = useCallback((options: ConfirmOptions) => {
    setModalState({
      isOpen: true,
      options,
    });
  }, []);

  const handleConfirm = useCallback(async () => {
    if (!modalState.options) return;

    try {
      setIsLoading(true);
      await modalState.options.onConfirm();
      setModalState({ isOpen: false, options: null });
    } catch (error) {
      console.error('Confirm action error:', error);
      // Don't close modal on error, let user retry
    } finally {
      setIsLoading(false);
    }
  }, [modalState.options]);

  const handleCancel = useCallback(() => {
    setModalState({ isOpen: false, options: null });
    setIsLoading(false);
  }, []);

  // Ensure we never render objects directly
  const modalElement = modalState.options ? (
    <ConfirmModal
      key={`confirm-${modalState.isOpen}`}
      isOpen={modalState.isOpen}
      title={modalState.options.title}
      message={modalState.options.message}
      confirmText={modalState.options.confirmText}
      cancelText={modalState.options.cancelText}
      variant={modalState.options.variant}
      onConfirm={handleConfirm}
      onCancel={handleCancel}
      isLoading={isLoading}
    />
  ) : null;

  return (
    <ConfirmContext.Provider value={{ confirm }}>
      {children}
      {modalElement}
    </ConfirmContext.Provider>
  );
}

export function useConfirm() {
  const context = useContext(ConfirmContext);
  if (!context) {
    throw new Error('useConfirm must be used within ConfirmProvider');
  }
  return {
    confirm: context.confirm,
    ConfirmDialog: null, // No longer needed, modal is rendered by provider
  };
}

