import { FiAward } from "react-icons/fi";

const CertificationsTab = ({ student }) => {
    const certifications = student.certifications || [];

    if (certifications.length === 0) {
        return <div className="text-sm text-gray-500 text-center py-6">No certifications available.</div>;
    }

    return (
        <div className="relative space-y-4">
            <button className="bg-amber-100 absolute top-2 right-0 mb-2 mr-2 border px-3 py-1.5 rounded-2xl text-sm flex items-center gap-1 hover:bg-amber-200">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M17 13l-5 5m0 0l-5-5m5 5V6" />
                </svg>
                Download All
            </button>
            {certifications.map((cert) => (
                <div key={cert.id} className="bg-amber-50 text-center border border-amber-100 text-sm rounded-2xl py-6 px-4 space-y-3">
                    <FiAward className="text-yellow-600 text-2xl mx-auto" />
                    <h2 className="text-lg font-semibold text-black">{cert.course}</h2>
                    <p className="text-gray-700 max-w-2xl mx-auto">
                        This certificate is awarded to <strong>{cert.awardedTo}</strong> for completing <strong>{cert.course}</strong> on {cert.date}.
                    </p>
                    <div className="text-xs font-medium text-gray-700 uppercase tracking-wider">{cert.platform}</div>
                </div>
            ))}
        </div>
    );
};

export default CertificationsTab;
