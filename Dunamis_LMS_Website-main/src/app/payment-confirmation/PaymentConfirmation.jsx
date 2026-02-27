'use client';

import { useMemo, useState, useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { HiArrowLeft, HiCheckCircle, HiClock, HiUser } from 'react-icons/hi';
import { useRouter } from 'next/navigation';
import LoginModal from '@/compoents/PopupModals/LoginModal';
import PaymentModal from '@/compoents/PopupModals/PaymentModal';
import { createEnrollmentOrder, verifyEnrollmentPayment, clearOrder } from '@/store/enrollmentSlice';

const IMAGE = process.env.NEXT_PUBLIC_IMAGE_URL;
const SESSION_KEY = 'enrollSelection';

const asMoney = (n) => {
  const v = Number(n);
  if (!Number.isFinite(v) || v < 0) return null;
  return `₹${v.toLocaleString('en-IN')}`;
};

export default function PaymentConfirmation() {
  const router = useRouter();
  const dispatch = useDispatch();

  const { user, token } = useSelector((s) => s.auth || {});
  const { order: razorpayOrder, loading: orderLoading, error: orderError } = useSelector((s) => s.enrollment || {});

  const [hasToken, setHasToken] = useState(false);
  const [loginOpen, setLoginOpen] = useState(false);
  const [payOpen, setPayOpen] = useState(false);
  const [sel, setSel] = useState(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const t = token || localStorage.getItem('auth_token');
    setHasToken(Boolean(t));
  }, [token]);

  useEffect(() => {
    try {
      const raw = sessionStorage.getItem(SESSION_KEY);
      setSel(raw ? JSON.parse(raw) : null);
    } catch (e) {
      setSel(null);
    }
  }, []);

  useEffect(() => {
    return () => {
      dispatch(clearOrder());
    };
  }, [dispatch]);

  const sessionType = sel?.sessionType || null;
  const planType = sel?.planType || null;
  const courseName = sel?.courseName || null;
  const category = sel?.category || null;
  const duration = sel?.duration || null;
  const courseImageParam = sel?.courseImage || null;
  const branch = sel?.branch || null;
  const instructorId = sel?.instructorId || null;
  const instructorLabel = sel?.instructorLabel || sel?.instructor || null;
  const slot = sel?.slot || null;
  const monthlyFee = sel?.monthlyFee ?? null;
  const fullPayment = sel?.fullPayment ?? null;
  const discount = sel?.discount ?? 0;
  const courseId = sel?.courseId || null;

  const uiSessionLabel = sessionType === 'premium' ? 'Individual Sessions' : sessionType === 'standard' ? 'Group Sessions' : null;

  const priceBlock = useMemo(() => {
    if (!sessionType) return { error: 'Missing or invalid sessionType.' };
    if (!planType) return { error: 'Missing or invalid planType.' };

    if (planType === 'monthly') {
      if (!monthlyFee && monthlyFee !== 0) return { error: 'Missing monthlyFee for monthly plan.' };
      const fee = Number(monthlyFee);
      if (!Number.isFinite(fee) || fee <= 0) return { error: 'Invalid monthlyFee amount.' };
      return {
        courseFee: fee,
        planName: 'Monthly Plan',
        planDuration: '1 month',
        billingText: 'Billed monthly • Cancel anytime',
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
      planName: 'Full Course Plan',
      planDuration: 'full',
      billingText: hasPct ? `One-time payment • Save ${pct}%` : 'One-time payment',
      mrp,
      savings,
      pct: hasPct ? pct : 0,
    };
  }, [sessionType, planType, monthlyFee, fullPayment, discount]);

  const srcImage = useMemo(() => {
    if (!courseImageParam) return null;
    return courseImageParam.startsWith('http') ? courseImageParam : `${IMAGE || ''}${courseImageParam}`;
  }, [courseImageParam]);

  const handleBackToCourse = () => router.push('/courses');

  const handlePayClick = async () => {
    if (priceBlock?.error) return;

    if (!hasToken) {
      setLoginOpen(true);
      return;
    }

    if (!courseId) {
      alert('Course ID is missing. Please restart enrollment.');
      return;
    }
    if (!sessionType) {
      alert('Session type is missing. Please restart enrollment.');
      return;
    }
    if (!instructorId) {
      alert('Please select an instructor first.');
      router.push(`/courses/${courseId}`);
      return;
    }
    if (!slot?.slotId) {
      alert('Please select a time slot first.');
      router.push(`/courses/${courseId}`);
      return;
    }

    const orderData = {
      courseId: courseId,
      sessionType: sessionType,
      teacherId: instructorId,
      slotId: slot.slotId,
    };

    const result = await dispatch(createEnrollmentOrder(orderData));

    if (createEnrollmentOrder.fulfilled.match(result)) {
      setPayOpen(true);
    } else {
      alert(result.payload || 'Failed to create order. Please try again.');
    }
  };

  const handlePaymentSuccess = async (paymentDetails) => {
    const verificationData = {
      razorpay_order_id: paymentDetails.razorpay_order_id,
      razorpay_payment_id: paymentDetails.razorpay_payment_id,
      razorpay_signature: paymentDetails.razorpay_signature,
      courseId: courseId,
      sessionType: sessionType,
      teacherId: instructorId,
      slotId: slot.slotId,
    };

    const result = await dispatch(verifyEnrollmentPayment(verificationData));

    if (verifyEnrollmentPayment.fulfilled.match(result)) {
      setPayOpen(false);
      sessionStorage.removeItem(SESSION_KEY);
      router.push('/payments/success');
    } else {
      alert('Payment verification failed. Please contact support.');
      setPayOpen(false);
    }
  };

  const handlePaymentFailure = () => {
    alert('Payment failed. Please try again.');
    setPayOpen(false);
  };

  const order = useMemo(() => {
    if (!razorpayOrder?.order) return null;
    return {
      id: razorpayOrder.order.id,
      amount: razorpayOrder.order.amount,
      currency: razorpayOrder.order.currency,
    };
  }, [razorpayOrder]);

  if (sel === null) {
    return (
      <div className="min-h-screen bg-gray-50 py-8 px-4">
        <div className="max-w-3xl mx-auto text-center mt-24">
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
        <div className="text-center mt-20">
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
                  {branch && (
                    <div className="flex items-center gap-1">
                      <span className="inline-block h-2 w-2 rounded-full bg-gray-400" />
                      <span>{branch}</span>
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
                    {sessionType === 'premium' ? 'One-on-one personalized sessions' : sessionType === 'standard' ? 'Interactive group sessions' : 'Session type missing'}
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

            {orderError && (
              <div className="mb-4 rounded-md bg-red-50 p-3 text-sm text-red-700">{orderError}</div>
            )}

            <button
              onClick={handlePayClick}
              disabled={Boolean(priceBlock?.error) || orderLoading}
              className={`mb-6 w-full rounded-full px-6 py-4 text-lg font-semibold text-white transition-colors ${priceBlock?.error || orderLoading ? 'cursor-not-allowed bg-gray-300' : 'bg-orange-500 hover:bg-orange-600'
                }`}
            >
              {orderLoading ? 'Creating order...' : priceBlock?.error ? 'Resolve errors to continue' : `Pay ${asMoney(priceBlock.courseFee)}`}
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

      {loginOpen && <LoginModal open={loginOpen} onClose={() => setLoginOpen(false)} />}

      {payOpen && order && (
        <PaymentModal
          open={payOpen}
          onClose={() => setPayOpen(false)}
          keyId={process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID}
          order={order}
          customer={{
            name: user?.name || '',
            email: user?.email || '',
            contact: user?.phone || '',
          }}
          notes={{ description: courseName || 'Course purchase' }}
          onSuccess={handlePaymentSuccess}
          onFailure={handlePaymentFailure}
        />
      )}
    </div>
  );
}
