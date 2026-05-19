'use client';

import { useEffect, useMemo, useRef, useState } from 'react';

const CASHFREE_SDK_URL = 'https://sdk.cashfree.com/js/v3/cashfree.js';

export default function PaymentModal({
    open,
    onClose,
    order,        // { orderId, paymentSessionId, amount, currency, mode }
    onSuccess,
    onFailure,
}) {
    const [loadingSdk, setLoadingSdk] = useState(false);
    const checkoutStarted = useRef(false);
    const canPay = useMemo(
        () => open && !!order?.paymentSessionId && !!order?.amount && !!order?.currency,
        [open, order]
    );

    useEffect(() => {
        if (!open) {
            checkoutStarted.current = false;
            return;
        }

        if (typeof window !== 'undefined' && !window.Cashfree) {
            setLoadingSdk(true);
            const existingScript = document.querySelector(`script[src="${CASHFREE_SDK_URL}"]`);
            if (existingScript) {
                existingScript.addEventListener('load', () => setLoadingSdk(false), { once: true });
                existingScript.addEventListener('error', () => setLoadingSdk(false), { once: true });
                return;
            }

            const script = document.createElement('script');
            script.src = CASHFREE_SDK_URL;
            script.async = true;
            script.onload = () => setLoadingSdk(false);
            script.onerror = () => setLoadingSdk(false);
            document.body.appendChild(script);
        }
    }, [open]);

    const openCheckout = async () => {
        if (!canPay || !window.Cashfree || checkoutStarted.current) return;

        checkoutStarted.current = true;
        const cashfree = window.Cashfree({
            mode: order.mode || process.env.NEXT_PUBLIC_CASHFREE_MODE || 'sandbox',
        });

        try {
            const result = await cashfree.checkout({
                paymentSessionId: order.paymentSessionId,
                redirectTarget: '_modal',
            });

            if (result?.error) {
                checkoutStarted.current = false;
                onFailure?.(result.error);
                return;
            }

            if (result?.paymentDetails) {
                onSuccess?.({
                    cashfree_order_id: order.orderId || order.id || order.cashfreeOrderId,
                    paymentDetails: result.paymentDetails,
                });
                onClose?.();
                return;
            }

            if (result?.redirect) {
                onClose?.();
                return;
            }

            checkoutStarted.current = false;
        } catch (error) {
            checkoutStarted.current = false;
            onFailure?.({ description: error.message || 'Cashfree checkout failed' });
        }
    };

    useEffect(() => {
        if (open && window.Cashfree && canPay) openCheckout();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [open, canPay, loadingSdk]);

    if (!open) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-start justify-center overflow-y-auto px-3 py-4 sm:items-center sm:px-4">
            <div className="absolute inset-0 bg-black/50 backdrop-blur-[2px]" onClick={onClose} aria-hidden="true" />
            <div className="relative my-auto w-full max-w-md">
                <div className="pointer-events-none absolute -inset-0.5 rounded-2xl bg-gradient-to-r from-orange-500/35 to-orange-700/35 blur-2xl opacity-80" />
                <div className="relative max-h-[calc(100vh-2rem)] overflow-y-auto rounded-2xl bg-white shadow-2xl ring-1 ring-black/5">
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

                    <div className="space-y-4 px-6 py-6">
                        <div className="flex items-center justify-between">
                            <span className="text-gray-600">Amount</span>
                            <span className="text-lg font-semibold text-gray-900">
                                ₹{Number(order?.amount || 0).toLocaleString('en-IN')}
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
                                ? 'cursor-not-allowed bg-orange-500/60'
                                : 'bg-gradient-to-r from-orange-500 to-orange-700 hover:from-orange-600 hover:to-orange-700'
                                }`}
                        >
                            {loadingSdk ? 'Loading...' : 'Pay with Cashfree'}
                        </button>

                        <p className="text-center text-xs text-gray-500">You will complete payment on Cashfree.</p>
                    </div>
                </div>
            </div>
        </div>
    );
}
