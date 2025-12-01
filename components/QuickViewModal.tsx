import React, { useState, useEffect } from 'react';
import type { Product } from './types';

interface QuickViewModalProps {
    product: Product;
    onClose: () => void;
    onAddToCart: (product: Product, buttonElement: HTMLButtonElement | null, selectedVariant: Record<string, string> | null) => void;
    onGoToProduct: () => void;
}

const QuickViewModal: React.FC<QuickViewModalProps> = ({ product, onClose, onAddToCart, onGoToProduct }) => {
    // Close on Escape key
    useEffect(() => {
        const handleKeyDown = (event: KeyboardEvent) => {
            if (event.key === 'Escape') onClose();
        };
        document.addEventListener('keydown', handleKeyDown);
        return () => document.removeEventListener('keydown', handleKeyDown);
    }, [onClose]);

    const [selectedVariant, setSelectedVariant] = useState<Record<string, string> | null>(null);

    // Initialize default variants
    useEffect(() => {
        if (product.variants) {
            const defaults: Record<string, string> = {};
            Object.keys(product.variants).forEach(key => {
                 if (product.variants![key].length > 0) {
                     defaults[key] = product.variants![key][0].value;
                 }
            });
            setSelectedVariant(defaults);
        } else {
            setSelectedVariant(null);
        }
    }, [product]);

    const handleVariantChange = (type: string, value: string) => {
        setSelectedVariant(prev => ({ ...prev, [type]: value }));
    };

    const buttonRef = React.useRef<HTMLButtonElement>(null);

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity" onClick={onClose}></div>
            
            <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden animate-fade-in-up flex flex-col md:flex-row max-h-[90vh]">
                <button 
                    onClick={onClose}
                    className="absolute top-4 right-4 z-10 p-2 bg-white/80 rounded-full hover:bg-gray-100 transition-colors"
                >
                    <svg className="w-6 h-6 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                </button>

                {/* Image */}
                <div className="w-full md:w-1/2 bg-gray-50 flex items-center justify-center p-6">
                    <img 
                        src={product.imageUrl} 
                        alt={product.name} 
                        className="max-h-64 md:max-h-80 object-contain mix-blend-multiply"
                    />
                </div>

                {/* Content */}
                <div className="w-full md:w-1/2 p-6 md:p-8 flex flex-col overflow-y-auto">
                    <div className="mb-1 text-xs font-bold text-fuchsia-600 uppercase tracking-wider">{product.brand}</div>
                    <h2 className="text-2xl font-bold text-gray-900 mb-2 leading-tight">{product.name}</h2>
                    
                    <div className="flex items-baseline gap-3 mb-4">
                        <span className="text-2xl font-bold text-gray-900">{product.price.toFixed(2)}€</span>
                        {product.regularPrice && product.regularPrice > product.price && (
                            <span className="text-sm text-gray-400 line-through">{product.regularPrice.toFixed(2)}€</span>
                        )}
                    </div>

                    <p className="text-gray-600 text-sm mb-6 line-clamp-3">{product.description}</p>

                    {/* Variants */}
                    {product.variants && (
                        <div className="mb-6 space-y-4">
                            {Object.keys(product.variants).map(type => (
                                <div key={type}>
                                    <label className="block text-xs font-bold text-gray-700 mb-2 uppercase">{type}: {selectedVariant?.[type]}</label>
                                    <div className="flex flex-wrap gap-2">
                                        {product.variants![type].map(opt => (
                                            opt.colorCode ? (
                                                <button
                                                    key={opt.value}
                                                    onClick={() => handleVariantChange(type, opt.value)}
                                                    className={`w-8 h-8 rounded-full border-2 transition-all ${selectedVariant?.[type] === opt.value ? 'border-fuchsia-600 scale-110' : 'border-gray-200'}`}
                                                    style={{ backgroundColor: opt.colorCode }}
                                                    title={opt.value}
                                                />
                                            ) : (
                                                <button
                                                    key={opt.value}
                                                    onClick={() => handleVariantChange(type, opt.value)}
                                                    className={`px-3 py-1 text-xs border rounded-md transition-colors ${selectedVariant?.[type] === opt.value ? 'bg-black text-white border-black' : 'bg-white text-gray-700 border-gray-200 hover:border-gray-400'}`}
                                                >
                                                    {opt.value}
                                                </button>
                                            )
                                        ))}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}

                    <div className="mt-auto space-y-3">
                        <button
                            ref={buttonRef}
                            onClick={() => onAddToCart(product, buttonRef.current, selectedVariant)}
                            className="w-full bg-black text-white font-bold py-3 px-4 rounded-xl hover:bg-gray-800 transition-colors shadow-lg"
                        >
                            Añadir al carrito
                        </button>
                        <button
                            onClick={onGoToProduct}
                            className="w-full bg-white text-gray-900 font-bold py-3 px-4 rounded-xl border-2 border-gray-200 hover:border-black transition-colors"
                        >
                            Ver detalles completos
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default QuickViewModal;