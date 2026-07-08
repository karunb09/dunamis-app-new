'use client';

import { useMemo, useState, useEffect, useRef } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { HiArrowLeft, HiCheckCircle, HiClock, HiUser } from 'react-icons/hi';
import { useRouter, useSearchParams } from 'next/navigation';
import toast from 'react-hot-toast';
import axios from 'axios';
import LoginModal from '@/components/PopupModals/LoginModal';
import PaymentModal from '@/components/PopupModals/PaymentModal';
import { createEnrollmentOrder, verifyEnrollmentPayment, clearOrder } from '@/store/enrollmentSlice';
import { getCurrentSelection, clearEnrollSelection, upsertEnrollSelection } from '@/helpers/session';
import { API_BASE } from '@/lib/apiBase';
import { resolveImageUrl } from '@/lib/resolveImageUrl';
import {
  clearEnrollmentResume,
  resolveEnrollmentResumeHref,
  saveEnrollmentResume,
} from '@/helpers/enrollmentResume';

const asMoney = (n) => {
  const v = Number(n);
  if (!Number.isFinite(v) || v < 0) return null;
  return `₹${v.toLocaleString('en-IN')}`;
};

export default function PaymentConfirmation() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const dispatch = useDispatch();

  const { user, token } = useSelector((s) => s.auth || {});
  const { order: cashfreeOrder, loading: orderLoading, error: orderError } = useSelector((s) => s.enrollment || {});

  const submittingRef = useRef(false);
  const [hasToken, setHasToken] = useState(false);
  const [loginOpen, setLoginOpen] = useState(false);
  const [payOpen, setPayOpen] = useState(false);
  const [pendingPaymentAction, setPendingPaymentAction] = useState(false);
  const [returnVerificationStatus, setReturnVerificationStatus] = useState(null);
  const [sel, setSel] = useState(null);
  const [referralCode, setReferralCode] = useState('');
  const [referralStatus, setReferralStatus] = useState(null);
  const isStudent = String(user?.accountType || '').toLowerCase() === 'student';
  const returnOrderId = searchParams.get('order_id');

  useEffect(() => {
    if (typeof window === 'undefined') return;
    // Auth comes from the store (seeded from the httpOnly session cookie).
    setHasToken(Boolean(token));
  }, [token]);

  useEffect(() => {
    try {
      setSel(getCurrentSelection());
    } catch (e) {
      setSel(null);
    }
  }, []);

  useEffect(() => {
    if (sel?.referralCode) setReferralCode(sel.referralCode);
  }, [sel]);

  useEffect(() => {
    if (!sel) return;
    if (hasToken) return;

    saveEnrollmentResume('/payment-confirmation');
    setPendingPaymentAction(true);
    setLoginOpen(true);
  }, [sel, hasToken]);

  useEffect(() => {
    return () => {
      dispatch(clearOrder());
    };
  }, [dispatch]);

  useEffect(() => {
    if (!returnOrderId || returnVerificationStatus || !hasToken) return;

    let cancelled = false;
    setReturnVerificationStatus('verifying');

    dispatch(verifyEnrollmentPayment({ cashfree_order_id: returnOrderId })).then((result) => {
      if (cancelled) return;

      if (verifyEnrollmentPayment.fulfilled.match(result)) {
        clearEnrollSelection();
        clearEnrollmentResume();
        setReturnVerificationStatus(
          result.payload?.transactionStatus === 'paid_pending_fulfillment'
            ? result.payload?.courseAccessGranted
              ? 'pending_fulfillment'
              : 'failed'
            : 'success'
        );
      } else {
        setReturnVerificationStatus('failed');
      }
    });

    return () => {
      cancelled = true;
    };
  }, [dispatch, hasToken, returnOrderId, returnVerificationStatus]);

  const selectedSessionType = sel?.sessionType || sel?.slot?.sessionType || null;
  const planType = sel?.planType || null;
  const planMonths = sel?.planMonths ?? null;
  const courseName = sel?.courseName || null;
  const category = sel?.category || null;
  const duration = sel?.duration || null;
  const courseImageParam = sel?.courseImage || null;
  const deliveryMode = sel?.deliveryMode || null;
  const branchId = sel?.branchId || null;
  const branchLabel = sel?.branchLabel || sel?.branch || null;
  const instructorId = sel?.instructorId || null;
  const instructorLabel = sel?.instructorLabel || sel?.instructor || null;
  const slot = sel?.slot || null;
  const monthlyFee = sel?.monthlyFee ?? null;
  const fullPayment = sel?.fullPayment ?? null;
  const discount = sel?.discount ?? 0;
  const courseId = sel?.courseId || null;

  const uiSessionLabel = selectedSessionType === 'premium' ? 'Individual Sessions' : selectedSessionType === 'standard' ? 'Group Sessions' : null;
  const uiDeliveryLabel = deliveryMode ? deliveryMode.charAt(0).toUpperCase() + deliveryMode.slice(1) : null;

  const priceBlock = useMemo(() => {
    if (!selectedSessionType) return { error: 'Missing or invalid sessionType.' };
    if (!planType) return { error: 'Missing or invalid planType.' };

    if (planType === 'monthly') {
      if (!monthlyFee && monthlyFee !== 0) return { error: 'Missing monthlyFee for monthly plan.' };
      const fee = Number(monthlyFee);
      if (!Number.isFinite(fee) || fee <= 0) return { error: 'Invalid monthlyFee amount.' };
      return {
        courseFee: fee,
        planName: planMonths ? `${planMonths}-Month Plan` : 'Monthly Plan',
        planDuration: planMonths ? `${planMonths} months` : '1 month',
        billingText: planMonths
          ? `Paid monthly over ${planMonths} months`
          : 'Billed monthly • Cancel anytime',
      };
    }

    if (!fullPayment && fullPayment !== 0) return { error: 'Missing fullPayment for full plan.' };
    const fee = Number(fullPayment);
    if (!Number.isFinite(fee) || fee <= 0) return { error: 'Invalid fullPayment amount.' };
    const pct = Number(discount);
    const hasPct = Number.isFinite(pct) && pct > 0 && pct < 100;
    const mrp = hasPct ? Math.round(fee / (1 - pct / 100)) : null;
    const savings = mrp ? mrp - fee : null;
    return {
      courseFee: fee,
      planName: planMonths ? `${planMonths}-Month Plan` : 'Full Course Plan',
      planDuration: planMonths ? `${planMonths} months` : 'Full course',
      billingText: hasPct ? `One-time payment • Save ${pct}%` : 'One-time payment',
      mrp,
      savings,
      pct: hasPct ? pct : 0,
    };
  }, [selectedSessionType, planType, monthlyFee, fullPayment, discount]);

  const srcImage = useMemo(() => {
    return resolveImageUrl(courseImageParam, '');
  }, [courseImageParam]);

  // Return to the specific course so the saved selection (instructor / slot /
  // plan) can be resumed, instead of dropping the user on the courses list.
  const handleBackToCourse = () =>
    router.push(courseId ? `/courses/${courseId}` : '/courses');

  const handleReferralChange = (e) => {
    const value = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '');
    setReferralCode(value);
    setReferralStatus(null);
    upsertEnrollSelection({ referralCode: value });
  };

  const handleApplyReferral = async () => {
    const code = referralCode.trim();
    if (!code) return;
    setReferralStatus('checking');
    try {
      const { data } = await axios.get(`${API_BASE}/v1/referral/validate/${code}`);
      setReferralStatus(data?.valid ? { valid: true, name: data.referrer?.name } : { valid: false });
    } catch {
      setReferralStatus({ valid: false });
    }
  };

  const submitPayment = async (account = user) => {
    if (submittingRef.current) return;

    if (String(account?.accountType || '').toLowerCase() !== 'student') {
      toast.error('Only student accounts can enroll in courses.');
      return;
    }

    if (priceBlock?.error) return;

    if (!courseId) {
      toast.error('Course ID is missing. Please restart enrollment.');
      return;
    }
    if (!selectedSessionType) {
      toast.error('Session type is missing. Please restart enrollment.');
      return;
    }
    if (!instructorId) {
      toast.error('Please select an instructor first.');
      router.push(`/courses/${courseId}`);
      return;
    }
    if (!slot?.slotId) {
      toast.error('Please select a time slot first.');
      router.push(`/courses/${courseId}`);
      return;
    }

    submittingRef.current = true;
    try {
      const orderData = {
        courseId: courseId,
        sessionType: selectedSessionType,
        planType,
        planMonths,
        teacherId: instructorId,
        slotId: slot.slotId,
        deliveryMode,
        branchId,
        referralCode: referralCode.trim() || undefined,
      };

      const result = await dispatch(createEnrollmentOrder(orderData));

      if (createEnrollmentOrder.fulfilled.match(result)) {
        setPayOpen(true);
      } else {
        toast.error(result.payload || 'Failed to create order. Please try again.');
      }
    } finally {
      submittingRef.current = false;
    }
  };

  const handlePayClick = async () => {
    if (!hasToken) {
      saveEnrollmentResume('/payment-confirmation');
      setPendingPaymentAction(true);
      setLoginOpen(true);
      return;
    }

    if (!isStudent) {
      toast.error('Only student accounts can enroll in courses.');
      return;
    }

    await submitPayment();
  };

  const handleAuthSuccess = async (payload) => {
    const signedInUser = payload?.user || user;
    if (String(signedInUser?.accountType || '').toLowerCase() !== 'student') {
      toast.error('Only student accounts can enroll in courses.');
      setPendingPaymentAction(false);
      setLoginOpen(false);
      return false;
    }

    setHasToken(true);
    setLoginOpen(false);

    if (pendingPaymentAction) {
      setPendingPaymentAction(false);
      await submitPayment(signedInUser);
      return;
    }
  };

  const handlePaymentSuccess = async (paymentDetails) => {
    const verificationData = {
      cashfree_order_id:
        paymentDetails.cashfree_order_id || order?.orderId || order?.id || order?.cashfreeOrderId,
    };

    const result = await dispatch(verifyEnrollmentPayment(verificationData));

    if (verifyEnrollmentPayment.fulfilled.match(result)) {
      if (result.payload?.transactionStatus === 'paid_pending_fulfillment') {
        toast(result.payload?.message || 'Payment verified. Support will review your slot assignment.', { icon: 'ℹ️' });
        setPayOpen(false);
        if (result.payload?.courseAccessGranted) {
          clearEnrollSelection();
          clearEnrollmentResume();
          router.push('/student/my-courses');
        }
        return;
      }

      setPayOpen(false);
      clearEnrollSelection();
      clearEnrollmentResume();
      router.push('/student/my-courses');
    } else {
      toast.error('Payment verification failed. Please contact support.');
      setPayOpen(false);
    }
  };

  const handlePaymentFailure = () => {
    toast.error('Payment failed. Please try again.');
    setPayOpen(false);
  };

  const order = useMemo(() => {
    if (!cashfreeOrder?.order) return null;
    return {
      id: cashfreeOrder.order.id,
      orderId: cashfreeOrder.order.orderId || cashfreeOrder.order.id,
      cashfreeOrderId: cashfreeOrder.order.cashfreeOrderId || cashfreeOrder.order.id,
      paymentSessionId: cashfreeOrder.order.paymentSessionId,
      amount: cashfreeOrder.order.amount,
      currency: cashfreeOrder.order.currency,
      mode: cashfreeOrder.order.mode,
    };
  }, [cashfreeOrder]);

  if (returnOrderId) {
    return (
      <div className="min-h-screen bg-gray-50 px-4 py-12">
        <div className="mx-auto max-w-xl rounded-3xl bg-white p-8 text-center shadow-sm">
          <h1 className="text-3xl font-bold text-gray-900">Payment Status</h1>
          {!hasToken ? (
            <>
              <p className="mt-4 text-gray-600">Please sign in to verify your payment and complete enrollment.</p>
              <button
                onClick={() => setLoginOpen(true)}
                className="mt-6 rounded-full bg-orange-500 px-6 py-3 font-semibold text-white hover:bg-orange-600"
              >
                Sign in to verify
              </button>
            </>
          ) : returnVerificationStatus === 'success' ? (
            <>
              <p className="mt-4 text-gray-600">Your payment has been verified and your enrollment is complete.</p>
              <button
                onClick={() => router.push('/student/my-courses')}
                className="mt-6 rounded-full bg-orange-500 px-6 py-3 font-semibold text-white hover:bg-orange-600"
              >
                Go to My Courses
              </button>
            </>
          ) : returnVerificationStatus === 'pending_fulfillment' ? (
            <>
              <p className="mt-4 text-gray-600">Your payment is verified and course access is enabled. Support will review your slot assignment.</p>
              <p className="mt-3 break-all rounded-2xl bg-gray-50 px-4 py-3 text-sm text-gray-500">{returnOrderId}</p>
              <button
                onClick={() => router.push('/student/my-courses')}
                className="mt-6 rounded-full bg-orange-500 px-6 py-3 font-semibold text-white hover:bg-orange-600"
              >
                Go to My Courses
              </button>
            </>
          ) : returnVerificationStatus === 'failed' ? (
            <>
              <p className="mt-4 text-gray-600">We could not verify this payment yet. If money was debited, please contact support with your order ID.</p>
              <p className="mt-3 break-all rounded-2xl bg-gray-50 px-4 py-3 text-sm text-gray-500">{returnOrderId}</p>
              <button
                onClick={() => setReturnVerificationStatus(null)}
                className="mt-6 rounded-full bg-gray-900 px-6 py-3 font-semibold text-white hover:bg-gray-800"
              >
                Retry Verification
              </button>
            </>
          ) : (
            <>
              <p className="mt-4 text-gray-600">Verifying your payment securely with Cashfree...</p>
              <div className="mx-auto mt-6 h-12 w-12 animate-spin rounded-full border-b-2 border-orange-500" />
            </>
          )}
        </div>

        {loginOpen && (
          <LoginModal
            open={loginOpen}
            onClose={() => setLoginOpen(false)}
            onSuccess={handleAuthSuccess}
            nextHref={`/payment-confirmation?order_id=${encodeURIComponent(returnOrderId)}`}
          />
        )}
      </div>
    );
  }

  if (sel === null) {
    return (
      <div className="min-h-screen bg-gray-50 py-8 px-4">
        <div className="mx-auto max-w-3xl text-center">
          <h1 className="text-2xl font-semibold">No selection found</h1>
          <p className="text-gray-600 mt-2">Please go back and choose a plan.</p>
          <button onClick={handleBackToCourse} className="mt-6 rounded-md bg-gray-900 px-4 py-2 text-white">
            Browse Courses
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-6xl mx-auto">
        <div className="text-center">
          <h1 className="text-4xl font-bold text-gray-900 mb-3">Payment Confirmation</h1>
          <p className="text-gray-500 text-lg">Review your course details and complete your enrollment</p>
          <button onClick={handleBackToCourse} className="mb-8 flex items-center justify-center gap-2 rounded-md px-4 py-2 text-gray-600 transition-colors hover:text-gray-900 mx-auto">
            <HiArrowLeft className="h-5 w-5" />
            <span className="font-medium">Back to Course</span>
          </button>
        </div>

        <div className="grid gap-8 lg:grid-cols-2">
          <div className="rounded-2xl bg-white p-8 shadow-sm">
            <h2 className="mb-6 text-2xl font-bold text-gray-900">Course Details</h2>

          <div className="mb-8 flex gap-4 border-b border-gray-100 pb-8">
              {srcImage ? (
                <img src={srcImage} alt={courseName || 'Course'} className="h-20 w-20 rounded-lg object-cover" />
              ) : (
                <div className="flex h-20 w-20 items-center justify-center rounded-lg bg-gray-200 text-xs text-gray-600">No Image</div>
              )}
              <div className="flex-1">
                <h3 className="mb-1 text-lg font-bold text-gray-900">{courseName || 'Course name missing'}</h3>
                <p className="mb-3 text-sm text-gray-500">{category || 'Category missing'}</p>
                <div className="flex flex-wrap items-center gap-4 text-sm text-gray-600">
                  <div className="flex items-center gap-1">
                    <HiUser className="h-4 w-4" />
                    <span>{instructorLabel || 'Instructor not selected'}</span>
                  </div>
                  {uiDeliveryLabel && (
                    <div className="flex items-center gap-1">
                      <span className="inline-block h-2 w-2 rounded-full bg-gray-400" />
                      <span>{uiDeliveryLabel}</span>
                    </div>
                  )}
                  {branchLabel && (
                    <div className="flex items-center gap-1">
                      <span className="inline-block h-2 w-2 rounded-full bg-gray-400" />
                      <span>{branchLabel}</span>
                    </div>
                  )}
                  {slot?.label ? (
                    <div className="flex items-center gap-1">
                      <HiClock className="h-4 w-4" />
                      <span>{slot.label}</span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-1">
                      <HiClock className="h-4 w-4" />
                      <span>{duration || 'Duration missing'}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="mb-8 space-y-6">
              <div className="flex items-center justify-between">
                <span className="text-gray-600">Session Type</span>
                <span className="font-semibold text-gray-900">{uiSessionLabel || 'Session type missing'}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-600">Plan Type</span>
                <span className="font-semibold text-gray-900">{priceBlock?.planName || 'Plan type missing'}</span>
              </div>
              {uiDeliveryLabel && (
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">Delivery Mode</span>
                  <span className="font-semibold text-gray-900">{uiDeliveryLabel}</span>
                </div>
              )}
              <div className="flex items-center justify-between">
                <span className="text-gray-600">Duration</span>
                <span className="font-semibold text-gray-900">{priceBlock?.planDuration || 'Duration unavailable'}</span>
              </div>
            </div>

            <div>
              <h3 className="mb-4 text-lg font-bold text-gray-900">What you'll get</h3>
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <HiCheckCircle className="h-5 w-5 flex-shrink-0 text-green-500" />
                  <span className="text-gray-700">
                    {selectedSessionType === 'premium' ? 'One-on-one personalized sessions' : selectedSessionType === 'standard' ? 'Interactive group sessions' : 'Session type missing'}
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <HiCheckCircle className="h-5 w-5 flex-shrink-0 text-green-500" />
                  <span className="text-gray-700">Access to course materials</span>
                </div>
                <div className="flex items-center gap-3">
                  <HiCheckCircle className="h-5 w-5 flex-shrink-0 text-green-500" />
                  <span className="text-gray-700">Progress tracking</span>
                </div>
                {planType === 'full' && (
                  <>
                    <div className="flex items-center gap-3">
                      <HiCheckCircle className="h-5 w-5 flex-shrink-0 text-green-500" />
                      <span className="text-gray-700">Priority support</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <HiCheckCircle className="h-5 w-5 flex-shrink-0 text-green-500" />
                      <span className="text-gray-700">Certificate of completion</span>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>

          <div className="rounded-2xl bg-white p-8 shadow-sm">
            <h2 className="mb-6 text-2xl font-bold text-gray-900">Payment Summary</h2>

            {priceBlock?.error ? (
              <div className="mb-6 rounded-md bg-red-50 p-4 text-sm text-red-700">{priceBlock.error}</div>
            ) : (
              <div className="mb-8 space-y-6">
                <div className="flex items-center justify-between border-b border-gray-100 pb-6">
                  <span className="text-gray-600">Course Fee</span>
                  <span className="font-semibold text-gray-900">
                    {asMoney(priceBlock.courseFee)}
                    {planType === 'monthly' ? '/month' : ''}
                  </span>
                </div>

                {priceBlock.mrp && (
                  <div className="flex items-center justify-between">
                    <span className="text-gray-600">MRP</span>
                    <span className="text-gray-400 line-through">{asMoney(priceBlock.mrp)}</span>
                  </div>
                )}

                {priceBlock.savings && (
                  <div className="flex items-center justify-between">
                    <span className="text-gray-600">You Save</span>
                    <span className="font-semibold text-green-600">{asMoney(priceBlock.savings)}</span>
                  </div>
                )}

                <div className="flex items-center justify-between pt-2">
                  <span className="text-xl font-bold text-gray-900">Total Amount</span>
                  <span className="text-3xl font-bold text-gray-900">{asMoney(priceBlock.courseFee)}</span>
                </div>

                <p className="text-sm text-gray-500">{priceBlock.billingText}</p>
              </div>
            )}

            <div className="mb-6">
              <label className="mb-2 block text-sm font-medium text-gray-700">Referral code (optional)</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={referralCode}
                  onChange={handleReferralChange}
                  placeholder="e.g. DSMI001"
                  maxLength={12}
                  className="w-full rounded-full border border-gray-200 px-4 py-2.5 font-mono text-sm uppercase tracking-wide focus:border-orange-400 focus:outline-none focus:ring-2 focus:ring-orange-100"
                />
                <button
                  type="button"
                  onClick={handleApplyReferral}
                  disabled={!referralCode.trim() || referralStatus === 'checking'}
                  className="shrink-0 rounded-full border border-orange-500 px-5 py-2.5 text-sm font-semibold text-orange-600 transition-colors hover:bg-orange-50 disabled:cursor-not-allowed disabled:border-gray-200 disabled:text-gray-400"
                >
                  {referralStatus === 'checking' ? 'Checking...' : 'Apply'}
                </button>
              </div>
              {referralStatus?.valid && (
                <p className="mt-2 flex items-center gap-1.5 text-sm text-green-600">
                  <HiCheckCircle className="h-4 w-4 flex-shrink-0" /> Referred by {referralStatus.name}
                </p>
              )}
              {referralStatus && referralStatus !== 'checking' && !referralStatus.valid && (
                <p className="mt-2 text-sm text-red-600">Code not recognized — you can still continue with payment.</p>
              )}
            </div>

            {orderError && (
              <div className="mb-4 rounded-md bg-red-50 p-3 text-sm text-red-700">{orderError}</div>
            )}

            <button
              onClick={handlePayClick}
              disabled={Boolean(priceBlock?.error) || orderLoading}
              className={`mb-6 w-full rounded-full px-6 py-4 text-lg font-semibold text-white transition-colors ${priceBlock?.error || orderLoading ? 'cursor-not-allowed bg-gray-300' : 'bg-orange-500 hover:bg-orange-600'
                }`}
            >
              {hasToken
                ? !isStudent
                  ? 'Student account required'
                  : orderLoading
                  ? 'Creating order...'
                  : priceBlock?.error
                    ? 'Resolve errors to continue'
                    : `Pay ${asMoney(priceBlock.courseFee)}`
                : 'Sign in to continue'}
            </button>

            <div className="space-y-3">
              <div className="flex items-start gap-2 text-sm text-gray-600">
                <HiCheckCircle className="mt-0.5 h-5 w-5 flex-shrink-0 text-green-500" />
                <span>Secure payment powered by industry standards</span>
              </div>
              <p className="ml-7 text-sm text-gray-500">Your payment information is encrypted and secure</p>
            </div>
          </div>
        </div>
      </div>

      {loginOpen && (
        <LoginModal
          open={loginOpen}
          onClose={() => setLoginOpen(false)}
          onSuccess={handleAuthSuccess}
          nextHref={resolveEnrollmentResumeHref('/payment-confirmation')}
        />
      )}

      {payOpen && order && (
        <PaymentModal
          open={payOpen}
          onClose={() => setPayOpen(false)}
          order={order}
          onSuccess={handlePaymentSuccess}
          onFailure={handlePaymentFailure}
        />
      )}
    </div>
  );
}
