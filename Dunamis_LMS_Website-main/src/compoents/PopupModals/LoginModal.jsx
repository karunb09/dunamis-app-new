'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useDispatch, useSelector } from 'react-redux';
import { login } from '@/store/authSlice';
import { HiMail, HiLockClosed } from 'react-icons/hi';

export default function LoginModal({ open, onClose, onSuccess, nextHref }) {
    const dispatch = useDispatch();
    const router = useRouter();
    const { loading, error } = useSelector((s) => s.auth);
    if (!open) return null;

    const signupHref = nextHref
        ? `/signup?next=${encodeURIComponent(nextHref)}`
        : '/signup';

    const handleSubmit = async (e) => {
        e.preventDefault();
        const fd = new FormData(e.currentTarget);
        const email = fd.get('email');
        const password = fd.get('password');
        const action = await dispatch(login({ email, password }));
        if (login.fulfilled.match(action)) {
            const result = await onSuccess?.(action.payload);
            if (result === false) return;

            if (nextHref && !onSuccess) {
                router.replace(nextHref);
                return;
            }

            onClose?.();
        }
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center">
            <div className="absolute inset-0 bg-black/50 backdrop-blur-[2px]" onClick={onClose} aria-hidden="true" />

            <div className="relative mx-4 w-full max-w-3xl">
                <div className="pointer-events-none absolute -inset-0.5 rounded-3xl bg-gradient-to-r from-orange-500/35 to-orange-600/35 blur-2xl opacity-80" />
                <div className="relative overflow-hidden rounded-3xl bg-white shadow-2xl ring-1 ring-black/5">
                    <div className="grid grid-cols-1 md:grid-cols-2">
                        <div className="relative hidden md:flex flex-col justify-between p-8 text-white bg-gradient-to-b from-orange-500 to-orange-600">
                            <div className="space-y-4">
                                <button
                                    onClick={onClose}
                                    aria-label="Close"
                                    className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-white/15 hover:bg-white/20 transition"
                                >
                                    <span className="text-xl leading-none">×</span>
                                </button>
                                <div className="mt-4">
                                    <h2 className="text-3xl font-bold tracking-tight">Welcome Back!</h2>
                                    <p className="mt-2 text-white/90">To keep connected with us, please login with your personal info.</p>
                                </div>
                            </div>
                            <div className="pt-8">
                                <button
                                    type="button"
                                    onClick={onClose}
                                    className="inline-flex items-center justify-center rounded-full border border-white/70 px-6 py-2 text-white hover:bg-white/10 transition"
                                >
                                    Close
                                </button>
                            </div>
                            <div className="pointer-events-none absolute -bottom-8 -left-10 h-40 w-40 rounded-full bg-white/15 blur-2xl" />
                            <div className="pointer-events-none absolute -bottom-12 left-24 h-28 w-28 rounded-full bg-white/10 blur-2xl" />
                        </div>

                        <div className="p-8">
                            <h3 className="text-2xl font-semibold text-gray-900">Sign in</h3>
                            <p className="mt-1 text-sm text-gray-500">Don’t have an account? You can create one during checkout.</p>

                            <form onSubmit={handleSubmit} className="mt-6 space-y-5">
                                <div>
                                    <label className="mb-2 block text-sm font-medium text-gray-700">Email address</label>
                                    <div className="relative">
                                        <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-gray-400">
                                            <HiMail className="h-5 w-5" />
                                        </span>
                                        <input
                                            name="email"
                                            type="email"
                                            required
                                            autoComplete="email"
                                            className="w-full rounded-full border border-gray-200 bg-white px-10 py-3 text-gray-900 placeholder:text-gray-400 shadow-sm outline-none transition focus:border-orange-600 focus:ring-2 focus:ring-orange-500"
                                            placeholder="you@example.com"
                                        />
                                    </div>
                                </div>

                                <div>
                                    <label className="mb-2 block text-sm font-medium text-gray-700">Password</label>
                                    <div className="relative">
                                        <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-gray-400">
                                            <HiLockClosed className="h-5 w-5" />
                                        </span>
                                        <input
                                            name="password"
                                            type="password"
                                            required
                                            autoComplete="current-password"
                                            className="w-full rounded-full border border-gray-200 bg-white px-10 py-3 text-gray-900 placeholder:text-gray-400 shadow-sm outline-none transition focus:border-orange-600 focus:ring-2 focus:ring-orange-500"
                                            placeholder="••••••••"
                                        />
                                    </div>
                                </div>

                                <div className="flex items-center justify-between pt-1">
                                    <a href="/forgot-password" className="text-sm text-orange-600 hover:text-orange-600 underline">
                                        Forgot/reset password?
                                    </a>
                                </div>

                                <button
                                    type="submit"
                                    disabled={loading}
                                    className={`group relative w-full overflow-hidden rounded-full px-6 py-3 font-semibold text-white shadow-lg focus:outline-none focus:ring-2 focus:ring-orange-500 ${loading
                                            ? 'bg-orange-500/60 cursor-not-allowed'
                                            : 'bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-600'
                                        }`}
                                >
                                    {loading ? 'Signing in…' : 'Sign in'}
                                </button>

                                {error ? <p className="text-center text-sm text-red-600">{error}</p> : null}

                                <p className="text-center text-sm text-gray-600">
                                    Don’t have an account?{' '}
                                    <Link
                                        href={signupHref}
                                        className="font-semibold text-orange-600 hover:text-orange-600 underline underline-offset-4"
                                        aria-label="Go to signup"
                                    >
                                        Sign up
                                    </Link>
                                </p>

                                <p className="text-center text-xs text-gray-500">By continuing you agree to our Terms and Privacy Policy.</p>
                            </form>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
