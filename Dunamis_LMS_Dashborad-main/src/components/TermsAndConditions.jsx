import {React, useState} from "react";
import { Link, useNavigate } from "react-router-dom";

const TermsAndConditions = () => {
  const navigate = useNavigate();
  const [agree, setAgree] = useState(false);

  const handleSignUp = () => {
    if (agree) {
      window.location.href = "https://dunamis-lms-website.netlify.app/signup";
    } else {
      alert("You must agree to the terms to continue.");
    }
  };



  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="max-w-2xl w-full bg-white shadow-lg rounded-2xl p-6 sm:p-10">
        <h1 className="text-2xl font-bold text-center mb-6">Terms & Conditions</h1>

        {/* Scrollable Terms and Conditions */}
        <div className="text-gray-700 text-sm sm:text-base leading-relaxed space-y-4 max-h-96 ">
          <p>By signing up as a teacher/trainer, you agree to the following:</p>

          <div>
            <h2 className="font-semibold">1. Professional Conduct</h2>
            <ul className="list-disc list-inside mt-2 space-y-1">
              <li>
                Provide accurate information about your qualifications, skills,
                and experience at the time of registration.
              </li>
              <li>
                Deliver all sessions on time, professionally, and in line with
                the course objectives.
              </li>
              <li>
                Maintain a respectful and safe environment for all learners.
              </li>
            </ul>
          </div>

          <div>
            <h2 className="font-semibold">2. Availability & Scheduling</h2>
            <ul className="list-disc list-inside mt-2 space-y-1">
              <li>
                Keep your availability schedule updated so students can book
                sessions smoothly.
              </li>
              <li>
                You are allowed to reschedule only one class per month at your
                own discretion.
              </li>
              <li>
                Any additional rescheduling requests must be submitted to and
                approved by the platform.
              </li>
            </ul>
          </div>

          {/* Extra */}
          {/* <div>
            <h2 className="font-semibold">3. Payment Terms</h2>
            <ul className="list-disc list-inside mt-2 space-y-1">
              <li>Details about payment terms, fees, etc.</li>
            </ul>
          </div> */}
        </div>


        <div className="flex items-center mt-10">
          <input
            type="checkbox"
            id="agreeTerms"
            className="mr-2"
            onChange={(e) => setAgree(e.target.checked)}
          />
          <label htmlFor="agreeTerms" className="text-sm text-gray-600">
            I agree to the <span className="text-blue-500">Terms & Conditions</span>
          </label>
        </div>

        {/* Buttons */}
        <div className="mt-8 flex flex-col items-center space-y-4">
          {/* Agree & Continue button */}
          <button
            onClick={handleSignUp}
            className="w-full sm:w-1/2 bg-gray-900 text-white py-2 rounded-full hover:bg-gray-800 transition"
          >
            Agree & Continue
          </button>

          {/* Sign In link */}
          <p className="text-sm text-gray-500">
            Already have an account?{" "}
            <Link
              to="/"
              className="text-purple-500 hover:underline font-medium"
            >
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default TermsAndConditions;
