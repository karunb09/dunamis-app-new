import { useState } from "react";
import dayjs from "dayjs";
import { toast } from "react-hot-toast";
import { useQuery } from "@tanstack/react-query";
import { FiAward, FiDownload } from "react-icons/fi";
import axios from "../../../../../api/axios";
import { downloadCertificate } from "../../../../../api/assessmentsApi";

const LEVEL_ORDER = ["beginner", "intermediate", "advanced"];
const titleCase = (value) => (value ? value.charAt(0).toUpperCase() + value.slice(1) : "");

// Certificates are awarded by the instructor at the end of a six-month
// assessment; this reads them from the certificates collection, which is the
// learner's level history.
const CertificationsTab = ({ student }) => {
    const [downloadingId, setDownloadingId] = useState(null);

    const { data, isLoading, isError } = useQuery({
        queryKey: ["certificates", "student", student?._id],
        queryFn: async () => {
            const res = await axios.get("/certificates", { params: { studentId: student._id } });
            return res.data;
        },
        enabled: Boolean(student?._id),
    });

    const certificates = (data?.certificates || [])
        .slice()
        .sort((a, b) => LEVEL_ORDER.indexOf(a.level) - LEVEL_ORDER.indexOf(b.level));

    const save = async (certificate) => {
        setDownloadingId(certificate._id);
        try {
            const blob = await downloadCertificate(certificate._id);
            const href = URL.createObjectURL(blob);
            const anchor = document.createElement("a");
            anchor.href = href;
            anchor.download = `${certificate.certificateNumber}.pdf`;
            document.body.appendChild(anchor);
            anchor.click();
            anchor.remove();
            URL.revokeObjectURL(href);
        } catch (err) {
            toast.error(err.message);
        } finally {
            setDownloadingId(null);
        }
    };

    if (isLoading) {
        return <div className="h-24 animate-pulse rounded-2xl bg-slate-100" />;
    }

    if (isError) {
        return <div className="py-6 text-center text-sm text-rose-600">Could not load certificates.</div>;
    }

    if (certificates.length === 0) {
        return <div className="py-6 text-center text-sm text-gray-500">No certificates awarded yet.</div>;
    }

    return (
        <div className="space-y-3">
            {certificates.map((cert) => (
                <div key={cert._id} className="flex items-center gap-4 rounded-2xl border border-amber-100 bg-amber-50 px-4 py-4">
                    <FiAward className="shrink-0 text-2xl text-amber-600" />
                    <div className="min-w-0 flex-1">
                        <p className="font-semibold text-slate-900">
                            {titleCase(cert.level)} · {cert.courseName}
                        </p>
                        <p className="text-xs text-slate-600">
                            {cert.certificateNumber} · awarded {dayjs(cert.issuedAt).format("D MMM YYYY")}
                            {cert.instructorName ? ` by ${cert.instructorName}` : ""}
                        </p>
                    </div>
                    <button
                        type="button"
                        onClick={() => save(cert)}
                        disabled={downloadingId === cert._id}
                        className="inline-flex items-center gap-1.5 rounded-2xl border border-amber-200 bg-white px-3 py-1.5 text-sm text-slate-700 hover:bg-amber-100 disabled:opacity-50"
                    >
                        <FiDownload />
                        {downloadingId === cert._id ? "Preparing..." : "PDF"}
                    </button>
                </div>
            ))}
        </div>
    );
};

export default CertificationsTab;
