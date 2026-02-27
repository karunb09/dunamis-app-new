"use client";

export default function TermsCondition() {
  return (
    <main className="min-h-screen flex items-center justify-center bg-gray-50 px-4 py-12">
      <div className="bg-white shadow-md rounded-2xl max-w-2xl w-full p-8">
        {/* Heading */}
        <h1 className="text-2xl font-bold text-center mb-4">
          Terms & Conditions
        </h1>
        <p className="text-gray-600 text-center mb-8">
          By signing up as a teacher/trainer, you agree to the following:
        </p>

        {/* Terms Content */}
        <div className="space-y-6 text-gray-700">
          {/* Section 1 */}
          <section>
            <h2 className="font-semibold mb-2">1. Professional Conduct</h2>
            <ul className="list-disc list-inside space-y-2">
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
          </section>

          {/* Section 2 */}
          <section>
            <h2 className="font-semibold mb-2">2. Availability & Scheduling</h2>
            <ul className="list-disc list-inside space-y-2">
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
          </section>
        </div>

        {/* Continue Button */}
        <div className="mt-10 flex justify-center">
          <a
            href="/signup?step=2"
            className="bg-orange-400 hover:bg-orange-500 text-white px-6 py-2 rounded-2xl"
          >
            Continue
          </a>
        </div>

        {/* Footer */}
        <p className="text-center text-sm text-gray-500 mt-6">
          Already have an account?{" "}
          <a href="/login" className="text-[#47c9c4] hover:underline">
            Sign in
          </a>
        </p>
      </div>
    </main>
  );
}
