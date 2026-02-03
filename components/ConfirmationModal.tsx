import React from 'react';

interface ConfirmationModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: () => void;
    title: string;
    message: string;
    confirmLabel?: string;
    cancelLabel?: string;
    variant?: 'danger' | 'warning' | 'info';
}

const ConfirmationModal: React.FC<ConfirmationModalProps> = ({
    isOpen,
    onClose,
    onConfirm,
    title,
    message,
    confirmLabel = 'Delete',
    cancelLabel = 'Cancel',
    variant = 'danger'
}) => {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/50 z-[60] flex items-center justify-center p-4 backdrop-blur-sm" onClick={onClose}>
            <div className="bg-white rounded-xl shadow-2xl max-w-sm w-full overflow-hidden animate-in fade-in zoom-in duration-200" onClick={e => e.stopPropagation()}>
                <div className="p-6 text-center">
                    <div className={`w-12 h-12 rounded-full p-2 flex items-center justify-center mx-auto mb-4 ${variant === 'danger' ? 'bg-red-100 text-red-600' :
                        variant === 'warning' ? 'bg-amber-100 text-amber-600' :
                            'bg-blue-100 text-blue-600'
                        }`}>
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                        </svg>
                    </div>
                    <h3 className="text-xl font-bold text-slate-900 mb-2">{title}</h3>
                    <p className="text-slate-500 mb-6 leading-relaxed">{message}</p>
                    <div className="flex gap-3 justify-center">
                        <button
                            onClick={onClose}
                            className="flex-1 px-4 py-2.5 cursor-pointer bg-white text-slate-700 border border-slate-200 rounded-xl hover:bg-slate-50 font-semibold transition-colors"
                        >
                            {cancelLabel}
                        </button>
                        <button
                            onClick={() => {
                                onConfirm();
                                onClose();
                            }}
                            className={`flex-1 px-4 py-2.5 cursor-pointer text-white rounded-xl font-semibold shadow-sm hover:shadow-md transition-all ${variant === 'danger' ? 'bg-red-600 hover:bg-red-700' :
                                variant === 'warning' ? 'bg-amber-600 hover:bg-amber-700' :
                                    'bg-blue-600 hover:bg-blue-700'
                                }`}
                        >
                            {confirmLabel}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ConfirmationModal;
