'use client';

import { useEffect, useMemo, useState } from 'react';

export default function PaymentModal({
    open,
    onClose,
    keyId,
    order,        // { id, amount, currency }
    customer,     // { name, email, contact }
    notes,
    themeColor = '#f97316',
    onSuccess,
    onFailure,
}) {
    const [loadingSdk, setLoadingSdk] = useState(false);
    const canPay = useMemo(
        () => open && !!keyId && !!order?.id && !!order?.amount && !!order?.currency,
        [open, keyId, order]
    );

    useEffect(() => {
        if (!open) return;
        if (typeof window !== 'undefined' && !window.Razorpay) {
            setLoadingSdk(true);
            const s = document.createElement('script');
            s.src = 'https://checkout.razorpay.com/v1/checkout.js';
            s.async = true;
            s.onload = () => setLoadingSdk(false);
            s.onerror = () => setLoadingSdk(false);
            document.body.appendChild(s);
        }
    }, [open]);

    const openCheckout = () => {
        if (!canPay || !window.Razorpay) return;

        const rzp = new window.Razorpay({
            key: keyId,
            order_id: order.id,
            amount: order.amount,
            currency: order.currency,
            name: customer?.name || 'Payment',
            description: notes?.description || 'Checkout',
            notes: notes || {},
            prefill: {
                name: customer?.name || '',
                email: customer?.email || '',
                contact: customer?.contact || '',
            },
            theme: { color: themeColor },
            handler: (resp) => {
                onSuccess?.({
                    razorpay_payment_id: resp.razorpay_payment_id,
                    razorpay_order_id: resp.razorpay_order_id,
                    razorpay_signature: resp.razorpay_signature,
                });
                onClose?.();
            },
            modal: {
                ondismiss: () => onFailure?.({ code: 'DISMISSED', description: 'Closed by user' }),
            },
        });

        rzp.on('payment.failed', (e) => onFailure?.(e?.error || { code: 'FAILED', description: 'Payment failed' }));
        rzp.open();
    };

    useEffect(() => {
        if (open && window.Razorpay && canPay) openCheckout();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [open, canPay]);

    if (!open) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center">
            <div className="absolute inset-0 bg-black/50 backdrop-blur-[2px]" onClick={onClose} aria-hidden="true" />
            <div className="relative mx-4 w-full max-w-md">
                <div className="pointer-events-none absolute -inset-0.5 rounded-2xl bg-gradient-to-r from-orange-500/35 to-orange-700/35 blur-2xl opacity-80" />
                <div className="relative overflow-hidden rounded-2xl bg-white shadow-2xl ring-1 ring-black/5">
                    <div className="bg-gradient-to-b from-orange-500 to-orange-700 px-6 py-4 text-white">
                        <div className="flex items-center justify-between">
                            <h3 className="text-base font-semibold">Payment</h3>
                            <button
                                onClick={onClose}
                                aria-label="Close"
                                className="inline-flex h-8 w-8 items-center justify-center rounded-md bg-white/15 hover:bg-white/20 transition"
                            >
                                <span className="text-xl leading-none">×</span>
                            </button>
                        </div>
                    </div>

                    <div className="px-6 py-6 space-y-4">
                        <div className="flex items-center justify-between">
                            <span className="text-gray-600">Amount</span>
                            <span className="text-lg font-semibold text-gray-900">
                                ₹{(Number(order?.amount || 0) / 100).toLocaleString('en-IN')}
                            </span>
                        </div>
                        <div className="flex items-center justify-between">
                            <span className="text-gray-600">Currency</span>
                            <span className="font-medium text-gray-900">{order?.currency}</span>
                        </div>

                        <button
                            onClick={openCheckout}
                            disabled={!canPay || loadingSdk}
                            className={`mt-2 w-full rounded-full px-6 py-3 font-semibold text-white shadow-lg focus:outline-none focus:ring-2 focus:ring-orange-500 ${!canPay || loadingSdk
                                ? 'bg-orange-500/60 cursor-not-allowed'
                                : 'bg-gradient-to-r from-orange-500 to-orange-700 hover:from-orange-600 hover:to-orange-700'
                                }`}
                        >
                            {loadingSdk ? 'Loading…' : 'Pay with Razorpay'}
                        </button>

                        <p className="text-center text-xs text-gray-500">You will complete payment on Razorpay.</p>
                    </div>
                </div>
            </div>
        </div>
    );
}
