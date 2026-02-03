import React from 'react';

interface ImagePreviewModalProps {
    isOpen: boolean;
    onClose: () => void;
    imageUrl: string | null;
    title?: string;
}

const ImagePreviewModal: React.FC<ImagePreviewModalProps> = ({ isOpen, onClose, imageUrl, title }) => {
    if (!isOpen || !imageUrl) return null;

    return (
        <div className="fixed inset-0 bg-black/90 z-[70] flex items-center justify-center p-4 backdrop-blur-sm transition-opacity" onClick={onClose}>
            <div className="relative max-w-5xl w-full flex flex-col items-center" onClick={e => e.stopPropagation()}>
                <button
                    onClick={onClose}
                    className="absolute -top-12 right-0 text-white/70 hover:text-white text-4xl leading-none transition-colors cursor-pointer"
                    title="Close"
                >
                    &times;
                </button>

                {title && (
                    <div className="absolute -top-10 left-0 text-white font-medium text-lg tracking-wide">
                        {title}
                    </div>
                )}

                <img
                    src={imageUrl}
                    alt={title || "Document Preview"}
                    className="max-w-full max-h-[85vh] object-contain rounded-lg shadow-2xl bg-zinc-900 border border-zinc-700"
                />
            </div>
        </div>
    );
};

export default ImagePreviewModal;
