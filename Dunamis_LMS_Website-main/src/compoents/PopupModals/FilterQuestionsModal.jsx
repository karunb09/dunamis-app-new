"use client";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X } from "lucide-react";
import { useRouter } from "next/navigation";

const filterQuestions = [
    {
        id: "category",
        question: "Which category are you interested in?",
        options: ["Music", "Dance", "Language", "All"],
    },
    {
        id: "mode",
        question: "Preferred learning mode?",
        options: ["Online", "Offline", "All"],
    },
    {
        id: "price",
        question: "Maximum price you're willing to pay?",
        options: ["₹500", "₹1000", "₹2000", "₹3000"],
    },
    {
        id: "duration",
        question: "Preferred course duration?",
        options: ["1-3 months", "3-6 months", "6+ months"],
    },
    {
        id: "goal",
        question: "What is your learning goal?",
        options: ["Due to Hobby", "Enhance skills", "Want to make Career"],
    },
];

const FilterQuestionsModal = ({ isOpen, onClose }) => {
    const [step, setStep] = useState(0);
    const [answers, setAnswers] = useState({});
    const router = useRouter();

    const handleSelect = (value) => {
        setAnswers({ ...answers, [filterQuestions[step].id]: value });
    };

    const handleNext = () => {
        if (step < filterQuestions.length - 1) {
            setStep(step + 1);
        } else {
            // Redirect with answers as query params
            const query = new URLSearchParams(answers).toString();
            router.push(`/courses?${query}`);
            onClose();
        }
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
                >
                    <motion.div
                        initial={{ scale: 0.9, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        exit={{ scale: 0.9, opacity: 0 }}
                        transition={{ duration: 0.3 }}
                        className="bg-white rounded-2xl p-6 w-full max-w-md shadow-lg relative overflow-y-auto max-h-[90vh]"
                    >
                        {/* Close button */}
                        <button
                            onClick={onClose}
                            className="cursor-pointer absolute top-4 right-4 text-gray-400 hover:text-gray-700"
                        >
                            <X size={24} />
                        </button>

                        {/* Progress */}
                        <div className="mb-4 mt-4">
                            <div className="h-2 w-full bg-gray-200 rounded-full">
                                <motion.div
                                    className="h-2 bg-black rounded-full"
                                    initial={{ width: 0 }}
                                    animate={{ width: `${((step + 1) / filterQuestions.length) * 100}%` }}
                                    transition={{ duration: 0.3 }}
                                />
                            </div>
                            <p className="text-sm text-gray-500 mt-1">
                                Question {step + 1} of {filterQuestions.length}
                            </p>
                        </div>

                        {/* Question */}
                        <h2 className="text-xl font-bold text-black mb-2">
                            {filterQuestions[step].question}
                        </h2>
                        <p className="text-sm text-gray-500 mb-4">
                            Choose the category that interests you most
                        </p>

                        {/* Options */}
                        <div className="space-y-3 ">
                            {filterQuestions[step].options.map((option) => (
                                <label
                                    key={option}
                                    className={`flex items-center space-x-3 px-4 py-3 rounded-xl border cursor-pointer ${answers[filterQuestions[step].id] === option
                                            ? "border-black bg-gray-100"
                                            : "border-gray-300 hover:bg-gray-50"
                                        }`}
                                >
                                    <input
                                        type="radio"
                                        name={filterQuestions[step].id}
                                        value={option}
                                        checked={answers[filterQuestions[step].id] === option}
                                        onChange={() => handleSelect(option)}
                                        className="accent-black w-5 h-5 cursor-pointer"
                                    />
                                    <span className="text-black font-medium">{option}</span>
                                </label>
                            ))}
                        </div>

                        {/* Navigation buttons */}
                        <div className="mt-6 text-center">
                            <motion.button
                                whileHover={{ scale: 1.05 }}
                                whileTap={{ scale: 0.95 }}
                                disabled={!answers[filterQuestions[step].id]}
                                onClick={handleNext}
                                className="cursor-pointer px-6 py-2 rounded-xl bg-black text-white disabled:opacity-50"
                            >
                                {step === filterQuestions.length - 1 ? "Apply Filters" : "Next"}
                            </motion.button>
                        </div>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>

    );
};

export default FilterQuestionsModal;
