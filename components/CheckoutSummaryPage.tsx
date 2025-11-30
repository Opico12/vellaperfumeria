
import React, { useMemo, useState, useEffect } from 'react';
import type { CartItem, View } from './types';
import type { Currency } from './currency';
import { formatCurrency } from './currency';
import { createOrder } from './api';

interface CheckoutSummaryPageProps {
    cartItems: CartItem[];
    currency: Currency;
    onUpdateQuantity: (cartItemId: string, newQuantity: number) => void;
    onRemoveItem: (cartItemId: string) => void;
    onNavigate: (view: View) => void;
}

const FREE_SHIPPING_THRESHOLD = 35;
const SHIPPING_COST = 6.00;

const CheckoutSummaryPage: React.FC<CheckoutSummaryPageProps> = ({ 
    cartItems, 
    currency, 
    onNavigate
}) => {
    // --- STATE MANAGEMENT ---
    const [isProcessing, setIsProcessing] = useState(false);
    
    // Customer Info
    const [email, setEmail] = useState('');
    
    // Shipping Form State
    const [shipping, setShipping] = useState({
        firstName: '',
        lastName: '',
        address: '',
        city: '',
        zip: '',
        phone: ''
    });

    // --- CALCULATIONS ---
    const subtotal = useMemo(() => {
        return cartItems.reduce((total, item) => total + item.product.price * item.quantity, 0);
    }, [cartItems]);

    const shippingCost = useMemo(() => {
        const hasShippingSaver = cartItems.some(item => item.product.isShippingSaver);
        return (hasShippingSaver || subtotal >= FREE_SHIPPING_THRESHOLD) ? 0 : SHIPPING_COST;
    }, [subtotal, cartItems]);

    const total = subtotal + shippingCost;

    // --- HANDLERS ---
    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setShipping(prev => ({ ...prev, [name]: value }));
    };

    const handleFinalizeOrder = async (e: React.FormEvent) => {
        e.preventDefault();
        
        if (!email || !shipping.firstName || !shipping.address || !shipping.phone) {
            alert("Por favor, completa los datos de contacto y envío.");
            return;
        }

        setIsProcessing(true);

        // 1. Construimos el pedido para WooCommerce
        const orderData = {
            payment_method: 'stripe', // Preparamos para Stripe (u otro que tengas por defecto)
            payment_method_title: 'Tarjeta de Crédito / Débito',
            set_paid: false, // No está pagado aún, se pagará en el siguiente paso
            billing: {
                first_name: shipping.firstName,
                last_name: shipping.lastName || '.',
                address_1: shipping.address,
                city: shipping.city,
                postcode: shipping.zip,
                country: 'ES',
                email: email,
                phone: shipping.phone
            },
            shipping: {
                first_name: shipping.firstName,
                last_name: shipping.lastName || '.',
                address_1: shipping.address,
                city: shipping.city,
                postcode: shipping.zip,
                country: 'ES'
            },
            line_items: cartItems.map(item => ({
                product_id: parseInt(item.product.id.toString().replace('wc-', '').replace('sim-', '')),
                quantity: item.quantity
            })),
            customer_note: "Pedido realizado desde Vellaperfumeria App (Pink Edition)"
        };

        try {
            // 2. Enviamos el pedido a tu tienda real
            const result = await createOrder(orderData);
            
            if (result && result.id) {
                console.log("Pedido creado con éxito:", result.id);
                
                // 3. REDIRECCIÓN AL PAGO REAL (Aquí es donde entra el dinero)
                // Construimos la URL oficial de pago de WooCommerce para este pedido
                // Necesitamos el ID del pedido y la 'order_key' (clave de seguridad)
                const orderId = result.id;
                const orderKey = result.order_key;
                
                // URL de pago directo en tu dominio
                const paymentUrl = `https://vellaperfumeria.com/finalizar-compra/order-pay/${orderId}/?pay_for_order=true&key=${orderKey}`;
                
                // Redirigimos al cliente para que ponga su tarjeta en tu pasarela segura
                window.location.href = paymentUrl;
            } else {
                // Fallback si falla la API (Modo simulación)
                alert("Error de conexión con la pasarela de pago. Se ha intentado registrar el pedido localmente.");
                setIsProcessing(false);
            }

        } catch (error) {
            console.error("Error processing order", error);
            alert("Hubo un error al conectar con el banco. Por favor, inténtalo de nuevo.");
            setIsProcessing(false);
        }
    };

    // --- EMPTY CART VIEW ---
    if (cartItems.length === 0) {
        return (
            <div className="container mx-auto px-4 py-16 text-center">
                <div className="bg-white rounded-3xl p-12 shadow-sm border border-gray-100 max-w-xl mx-auto">
                    <h2 className="text-2xl font-bold text-gray-900 mb-4">Tu carrito está vacío</h2>
                    <button 
                        onClick={() => onNavigate('products')}
                        className="bg-black text-white font-bold py-3 px-8 rounded-full shadow-lg"
                    >
                        Ir a Comprar
                    </button>
                </div>
            </div>
        );
    }

    // --- CHECKOUT FORM VIEW ---
    return (
        <div className="bg-fuchsia-50 min-h-screen pb-12">
            <div className="container mx-auto px-4 max-w-4xl mt-6">
                
                <div className="text-center mb-8">
                    <h1 className="text-3xl font-extrabold text-black">Finalizar Compra Segura</h1>
                    <p className="text-gray-500 mt-2">Tus datos se enviarán encriptados a Vellaperfumeria.com</p>
                </div>

                <form onSubmit={handleFinalizeOrder} className="flex flex-col gap-6">
                    
                    {/* ORDER TOTAL CARD */}
                    <div className="bg-white rounded-2xl p-6 shadow-lg border border-fuchsia-100 flex flex-col items-center justify-center text-center">
                        <p className="text-sm text-gray-500 mb-1">Total a pagar</p>
                        <p className="text-4xl font-extrabold text-fuchsia-600 tracking-tight">{formatCurrency(total, currency)}</p>
                        <div className="text-xs text-gray-400 mt-2 flex items-center gap-1">
                            <span>{cartItems.length} artículos</span>
                            <span>•</span>
                            <span>Envío {shippingCost === 0 ? 'Gratis' : formatCurrency(shippingCost, currency)}</span>
                        </div>
                    </div>

                    {/* 1. CONTACT & SHIPPING */}
                    <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-200">
                        <h2 className="text-sm font-bold text-gray-900 uppercase tracking-wide mb-4 border-b pb-2">1. Datos de Envío</h2>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-xs font-bold text-gray-500 mb-1">Email (para confirmación)</label>
                                <input required type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="w-full border border-gray-300 rounded-lg p-3 bg-gray-50 focus:bg-white focus:ring-2 focus:ring-fuchsia-500 outline-none transition-all" placeholder="tu@email.com" />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 mb-1">Nombre</label>
                                    <input required type="text" name="firstName" value={shipping.firstName} onChange={handleInputChange} className="w-full border border-gray-300 rounded-lg p-3 bg-gray-50 focus:bg-white focus:ring-2 focus:ring-fuchsia-500 outline-none transition-all" />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 mb-1">Apellidos</label>
                                    <input required type="text" name="lastName" value={shipping.lastName} onChange={handleInputChange} className="w-full border border-gray-300 rounded-lg p-3 bg-gray-50 focus:bg-white focus:ring-2 focus:ring-fuchsia-500 outline-none transition-all" />
                                </div>
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-500 mb-1">Dirección</label>
                                <input required type="text" name="address" value={shipping.address} onChange={handleInputChange} className="w-full border border-gray-300 rounded-lg p-3 bg-gray-50 focus:bg-white focus:ring-2 focus:ring-fuchsia-500 outline-none transition-all" placeholder="Calle, número..." />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 mb-1">Ciudad</label>
                                    <input required type="text" name="city" value={shipping.city} onChange={handleInputChange} className="w-full border border-gray-300 rounded-lg p-3 bg-gray-50 focus:bg-white focus:ring-2 focus:ring-fuchsia-500 outline-none transition-all" />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 mb-1">CP</label>
                                    <input required type="text" name="zip" value={shipping.zip} onChange={handleInputChange} className="w-full border border-gray-300 rounded-lg p-3 bg-gray-50 focus:bg-white focus:ring-2 focus:ring-fuchsia-500 outline-none transition-all" />
                                </div>
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-500 mb-1">Teléfono</label>
                                <input required type="tel" name="phone" value={shipping.phone} onChange={handleInputChange} className="w-full border border-gray-300 rounded-lg p-3 bg-gray-50 focus:bg-white focus:ring-2 focus:ring-fuchsia-500 outline-none transition-all" />
                            </div>
                        </div>
                    </div>

                    {/* 2. PAYMENT INFO BLOCK */}
                    <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-200">
                        <h2 className="text-sm font-bold text-gray-900 uppercase tracking-wide mb-4 border-b pb-2">2. Pago Seguro</h2>
                        <div className="bg-green-50 border border-green-200 rounded-lg p-4 flex items-start gap-3">
                             <svg className="w-6 h-6 text-green-600 mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            <div>
                                <p className="text-sm font-bold text-green-800">Pasarela de Pago Oficial</p>
                                <p className="text-xs text-green-700 mt-1">
                                    Al pulsar "Proceder al Pago", serás redirigido a la pasarela segura de <b>Vellaperfumeria.com</b> para introducir tu tarjeta. 
                                    El cobro aparecerá en tu banco como "Vellaperfumeria".
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* PAY BUTTON */}
                    <div className="mt-4 mb-8">
                        <button 
                            type="submit"
                            disabled={isProcessing}
                            className={`w-full bg-black text-white font-extrabold py-4 rounded-xl shadow-xl hover:bg-gray-900 transition-all transform active:scale-95 flex justify-center items-center gap-3 text-lg ${isProcessing ? 'opacity-70 cursor-wait' : ''}`}
                        >
                            {isProcessing ? (
                                <>
                                    <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                    </svg>
                                    Conectando con el Banco...
                                </>
                            ) : (
                                <>
                                    <span>PROCEDER AL PAGO SEGURO</span>
                                    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                                    </svg>
                                </>
                            )}
                        </button>
                        
                        <p className="text-center text-xs text-gray-400 mt-4 flex justify-center items-center gap-2">
                            <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24"><path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4zm0 10.99h7c-.53 4.12-3.28 7.79-7 8.94V12H5V6.3l7-3.11v8.8z"/></svg>
                            Pago encriptado SSL de 256-bits
                        </p>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default CheckoutSummaryPage;
