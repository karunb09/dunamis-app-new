'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { login, logoutSession } from '@/store/authSlice';
import {
    getPortalForAccountType,
    getPortalLabel,
    getRoleDestination,
} from '@/lib/roleRouting';
import { HiEye, HiEyeOff, HiLockClosed, HiMail } from 'react-icons/hi';
import FloatingInput from '@/components/FloatingInput';
import { useModalA11y } from '@/hooks/useModalA11y';

export default function LoginModal({ open, onClose, onSuccess, nextHref }) {
    const dispatch = useDispatch();
    const router = useRouter();
    const { loading, error } = useSelector((s) => s.auth);
    const [showPassword, setShowPassword] = useState(false);
    const [staffPortalNotice, setStaffPortalNotice] = useState(null);
    const panelRef = useRef(null);
    useModalA11y(open, onClose, panelRef);

    useEffect(() => {
        if (!open) return undefined;
        const previousOverflow = document.body.style.overflow;
        document.body.style.overflow = 'hidden';
        return () => {
            document.body.style.overflow = previousOverflow;
        };
    }, [open]);

    if (!open) return null;

    const signupHref = nextHref
        ? `/signup?next=${encodeURIComponent(nextHref)}`
        : '/signup';

    const handleSubmit = async (e) => {
        e.preventDefault();
        const fd = new FormData(e.currentTarget);
        const email = fd.get('email');
        const password = fd.get('password');
        const action = await dispatch(login({ email, password, portalIntent: 'student' }));
        if (login.fulfilled.match(action)) {
            const accountType = action.payload?.user?.accountType;
            const actualPortal = getPortalForAccountType(accountType);
            const destination = getRoleDestination(accountType);

            if (actualPortal && actualPortal !== 'student') {
                await dispatch(logoutSession());
                setStaffPortalNotice({
                    portalLabel: getPortalLabel(actualPortal),
                    href: destination,
                });
                return;
            }

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
        <div className="fixed inset-0 z-[100] flex items-start justify-center overflow-y-auto px-3 py-4 sm:items-center sm:px-4">
            <div className="absolute inset-0 bg-black/50 backdrop-blur-[2px]" onClick={onClose} aria-hidden="true" />

            <div className="relative my-auto w-full max-w-3xl">
                <div className="pointer-events-none absolute -inset-0.5 rounded-3xl bg-gradient-to-r from-orange-500/35 to-orange-600/35 blur-2xl opacity-80" />
                <div
                    ref={panelRef}
                    role="dialog"
                    aria-modal="true"
                    aria-label="Student sign in"
                    tabIndex={-1}
                    className="relative max-h-[calc(100vh-2rem)] overflow-y-auto rounded-3xl bg-white shadow-2xl outline-none ring-1 ring-black/5">
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

                        <div className="p-5 sm:p-8">
                            {staffPortalNotice ? (
                                <div className="flex min-h-[440px] flex-col justify-center text-center">
                                    <p className="text-xs font-semibold uppercase tracking-[0.24em] text-orange-500">Staff Portal Required</p>
                                    <h3 className="mt-3 text-2xl font-semibold text-gray-900">Use the dashboard to sign in</h3>
                                    <p className="mt-3 text-sm leading-6 text-gray-500">
                                        This email belongs to a {staffPortalNotice.portalLabel} account. Admins and instructors sign in from the Staff Portal, not the student website.
                                    </p>
                                    <div className="mt-6 grid gap-3">
                                        <a
                                            href={staffPortalNotice.href}
                                            className="inline-flex items-center justify-center rounded-full bg-orange-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-orange-700"
                                        >
                                            Open Staff Portal
                                        </a>
                                        <button
                                            type="button"
                                            onClick={() => setStaffPortalNotice(null)}
                                            className="inline-flex items-center justify-center rounded-full border border-gray-200 px-5 py-3 text-sm font-semibold text-gray-700 transition hover:bg-gray-50"
                                        >
                                            Try another student account
                                        </button>
                                    </div>
                                </div>
                            ) : (
                                <>
                                    <h3 className="text-2xl font-semibold text-gray-900">Student sign in</h3>
                                    <p className="mt-1 text-sm text-gray-500">Use this form for student accounts only. Instructors and admins should use the Staff Portal.</p>

                                    <form onSubmit={handleSubmit} className="mt-6 space-y-5">
                                <FloatingInput
                                    id="login-modal-email"
                                    label="Email address"
                                    name="email"
                                    type="email"
                                    required
                                    autoComplete="email"
                                    icon={<HiMail className="h-5 w-5" />}
                                />

                                <FloatingInput
                                    id="login-modal-password"
                                    label="Password"
                                    name="password"
                                    type={showPassword ? 'text' : 'password'}
                                    required
                                    autoComplete="current-password"
                                    icon={<HiLockClosed className="h-5 w-5" />}
                                    trailing={
                                        <button
                                            type="button"
                                            onClick={() => setShowPassword((current) => !current)}
                                            tabIndex={-1}
                                            className="absolute inset-y-0 right-4 z-10 flex items-center text-gray-400 transition hover:text-gray-600"
                                            aria-label={showPassword ? 'Hide password' : 'Show password'}
                                        >
                                            {showPassword ? (
                                                <HiEyeOff className="h-5 w-5" />
                                            ) : (
                                                <HiEye className="h-5 w-5" />
                                            )}
                                        </button>
                                    }
                                />

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
                                    {loading ? 'Signing in…' : 'Sign in as Student'}
                                </button>

                                {error ? <p role="alert" className="text-center text-sm text-red-600">{error}</p> : null}

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
                                </>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
