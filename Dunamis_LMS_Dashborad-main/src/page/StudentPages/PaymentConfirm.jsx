import React, { useEffect } from 'react';
import { HiArrowLeft, HiCheckCircle, HiClock, HiUser } from 'react-icons/hi';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { getCourseDetails } from '../../redux/Course/CourseSlice';

import { resolveImageUrl } from "../../utils/resolveImageUrl";

export default function PaymentConfirmation() {
  const navigate = useNavigate();
  const location = useLocation();
  const dispatch = useDispatch();
  const { courseId } = useParams();
  
  const state = location.state || {};

  const { course: courseFromRedux, status, error } = useSelector((state) => state.course);
  
  const courseData = state.course || courseFromRedux?.info || {};

  useEffect(() => {
    if (!state.course && courseId) {
      dispatch(getCourseDetails(courseId));
    }
  }, [courseId, state.course, dispatch]);

  const sessionType = state.sessionType || 'Group Sessions';
  const planType = state.planType || 'monthly';
  const selectedSessionTypeKey = state.selectedSessionTypeKey || 'group';

  const courseName = courseData.name || 'Course Name';
  const category = courseData.category?.name || 'Music';
  const courseImage = resolveImageUrl(
    courseData.image || courseData.thumbnail,
    'https://images.unsplash.com/photo-1510915361894-db8b60106cb1?w=400&h=400&fit=crop'
  );

  const startDate = courseData.startDate ? new Date(courseData.startDate) : null;
  const endDate = courseData.endDate ? new Date(courseData.endDate) : null;
  const duration = startDate && endDate 
    ? `${Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24 * 30))} months`
    : courseData.duration || 'Not specified';

  const teacher = courseData.teacher?.[0];
  const instructor = teacher?.teacherDetail?.name 
    ? `${teacher.teacherDetail.name.firstName} ${teacher.teacherDetail.name.lastName}` 
    : 'Instructor';

  const getPricing = () => {
    const priceArray = courseData.price || [];
    
    const matchedPrice = priceArray.find(p => {
      const isGroupSession = p.sessionType === "standard";
      const isMatchingType = 
        (selectedSessionTypeKey === "group" && isGroupSession) ||
        (selectedSessionTypeKey === "oneonone" && !isGroupSession);
      
      return isMatchingType && p.isActive;
    });

    if (matchedPrice) {
      if (planType === 'monthly') {
        return {
          courseFee: matchedPrice.monthlyFee || 0,
          planName: 'Monthly Plan',
          planDuration: '1 month',
          billingText: 'Billed monthly • Cancel anytime',
          fullAmount: matchedPrice.fullPayment || 0,
          discount: matchedPrice.discount || 0,
        };
      } else {
        const discountedPrice = (matchedPrice.fullPayment || 0) - (matchedPrice.discount || 0);
        return {
          courseFee: discountedPrice,
          planName: 'Full Course Plan',
          planDuration: duration,
          billingText: `${matchedPrice.discount ? Math.round((matchedPrice.discount / matchedPrice.fullPayment) * 100) + '% discount • ' : ''}Priority support • Certificate`,
          fullAmount: matchedPrice.fullPayment || 0,
          discount: matchedPrice.discount || 0,
        };
      }
    } else {
      if (sessionType === 'Individual Sessions') {
        return planType === 'monthly'
          ? {
              courseFee: 4400,
              planName: 'Monthly Plan',
              planDuration: '1 month',
              billingText: 'Billed monthly • Cancel anytime',
              fullAmount: 0,
              discount: 0,
            }
          : {
              courseFee: 29920,
              planName: 'Full Course Plan',
              planDuration: '8 months',
              billingText: 'One-time payment • Save 15%',
              fullAmount: 35200,
              discount: 5280,
            };
      } else {
        return planType === 'monthly'
          ? {
              courseFee: 2200,
              planName: 'Monthly Plan',
              planDuration: '1 month',
              billingText: 'Billed monthly • Cancel anytime',
              fullAmount: 0,
              discount: 0,
            }
          : {
              courseFee: 14960,
              planName: 'Full Course Plan',
              planDuration: '8 months',
              billingText: 'One-time payment • Save 15%',
              fullAmount: 17600,
              discount: 2640,
            };
      }
    }
  };

  const pricing = getPricing();

  const handlePayment = () => {
    navigate('/');
  };

  const handleBackToCourse = () => {
    if (location.key !== 'default') {
      navigate(-1);
    } else {
      navigate('/explore-courses');
    }
  };

  if (status === 'loading') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900"></div>
          <p className="text-gray-600 mt-4 font-medium">Loading course details...</p>
        </div>
      </div>
    );
  }

  if (status === 'failed') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600 font-semibold text-lg mb-4">Error loading course</p>
          <button
            onClick={() => navigate(-1)}
            className="px-6 py-2 bg-gray-900 text-white rounded-full hover:bg-gray-800 transition"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-6xl mx-auto">
      
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-3">Payment Confirmation</h1>
          <p className="text-gray-500 text-lg">Review your course details and complete your enrollment</p>
          <button 
            onClick={handleBackToCourse}
            className="flex items-center text-gray-600 hover:text-gray-900 transition-colors px-4 py-2 mt-4 mx-auto"
          >
            <HiArrowLeft className="w-5 h-5 mr-2" />
            <span className="font-medium">Back to Course</span>
          </button>
        </div>

        <div className="grid lg:grid-cols-2 gap-8">
          <div className="bg-white rounded-2xl shadow-sm p-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Course Details</h2>
            
            <div className="flex gap-4 mb-8 pb-8 border-b border-gray-100">
              <img 
                src={courseImage} 
                alt={courseName}
                className="w-20 h-20 rounded-lg object-cover"
              />
              <div className="flex-1">
                <h3 className="font-bold text-gray-900 text-lg mb-1">{courseName}</h3>
                <p className="text-gray-500 text-sm mb-3">{category}</p>
                <div className="flex items-center gap-4 text-sm text-gray-600">
                  <div className="flex items-center gap-1">
                    <HiUser className="w-4 h-4" />
                    <span>{instructor}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <HiClock className="w-4 h-4" />
                    <span>{duration}</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-6 mb-8">
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Session Type</span>
                <span className="font-semibold text-gray-900">{sessionType}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Plan Type</span>
                <span className="font-semibold text-gray-900">{pricing.planName}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Duration</span>
                <span className="font-semibold text-gray-900">{pricing.planDuration}</span>
              </div>
            </div>

            <div>
              <h3 className="font-bold text-gray-900 text-lg mb-4">What you'll get</h3>
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <HiCheckCircle className="w-5 h-5 text-green-500 flex-shrink-0" />
                  <span className="text-gray-700">
                    {sessionType === 'Individual Sessions' 
                      ? 'One-on-one personalized sessions' 
                      : 'Interactive group sessions'}
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <HiCheckCircle className="w-5 h-5 text-green-500 flex-shrink-0" />
                  <span className="text-gray-700">Access to course materials</span>
                </div>
                <div className="flex items-center gap-3">
                  <HiCheckCircle className="w-5 h-5 text-green-500 flex-shrink-0" />
                  <span className="text-gray-700">Progress tracking</span>
                </div>
                {planType === 'full' && (
                  <>
                    <div className="flex items-center gap-3">
                      <HiCheckCircle className="w-5 h-5 text-green-500 flex-shrink-0" />
                      <span className="text-gray-700">Priority support</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <HiCheckCircle className="w-5 h-5 text-green-500 flex-shrink-0" />
                      <span className="text-gray-700">Certificate of completion</span>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-sm p-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Payment Summary</h2>
            
            <div className="space-y-6 mb-8">
              <div className="flex justify-between items-center pb-6 border-b border-gray-100">
                <span className="text-gray-600">Course Fee</span>
                <span className="text-gray-900 font-semibold">
                  ₹{Math.round(pricing.courseFee).toLocaleString()}
                  {planType === 'monthly' ? '/month' : ''}
                </span>
              </div>

              {pricing.discount > 0 && (
                <div className="flex justify-between items-center pb-6 border-b border-gray-100">
                  <span className="text-gray-600">Full Price</span>
                  <span className="line-through text-gray-400 font-semibold">
                    ₹{Math.round(pricing.fullAmount).toLocaleString()}
                  </span>
                </div>
              )}

              {pricing.discount > 0 && (
                <div className="flex justify-between items-center pb-6 border-b border-gray-100">
                  <span className="text-green-600 font-semibold">You Save</span>
                  <span className="text-green-600 font-bold">
                    ₹{Math.round(pricing.discount).toLocaleString()}
                  </span>
                </div>
              )}
              
              <div className="flex justify-between items-center pt-2">
                <span className="text-xl font-bold text-gray-900">Total Amount</span>
                <span className="text-3xl font-bold text-gray-900">₹{Math.round(pricing.courseFee).toLocaleString()}</span>
              </div>
              
              <p className="text-sm text-gray-500">{pricing.billingText}</p>
            </div>

            <button 
              onClick={handlePayment}
              className="w-full bg-[#232C53] hover:bg-orange-600 text-white font-semibold py-4 px-6 rounded-full text-lg transition-colors mb-6"
            >
              Pay ₹{Math.round(pricing.courseFee).toLocaleString()}
            </button>

            <div className="space-y-3">
              <div className="flex items-start gap-2 text-sm text-gray-600">
                <HiCheckCircle className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                <span>Secure payment powered by industry standards</span>
              </div>
              <p className="text-sm text-gray-500 ml-7">
                Your payment information is encrypted and secure
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
