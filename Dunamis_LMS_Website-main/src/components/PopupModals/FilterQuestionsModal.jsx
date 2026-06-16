"use client";
import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { LuX } from "react-icons/lu";
import { useRouter } from "next/navigation";
import { useDispatch, useSelector } from "react-redux";
import { fetchCategories } from "@/store/categorySlice";

const modeQuestion = {
    id: "mode",
    question: "How would you like to learn?",
    description:
      "Choose a preferred mode now. You can still refine the filters on the courses page.",
    options: [
      { label: "Online", value: "online" },
      { label: "Offline", value: "offline" },
      { label: "I'm open to both", value: "all" },
    ],
};

const FilterQuestionsModal = ({ isOpen, onClose }) => {
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState({});
  const dispatch = useDispatch();
  const router = useRouter();
  const { categories = [] } = useSelector((state) => state.category || {});
  const categoryOptions = Array.from(
    new Set(
      categories
        .filter((category) => category.status === "published" || !category.status)
        .map((category) => category.name)
        .filter(Boolean)
    )
  ).map((name) => ({ label: name, value: name }));
  const filterQuestions = [
    {
      id: "category",
      question: "What are you interested in learning?",
      description:
        "We'll take you to the most relevant courses first so you can keep moving.",
      options: [
        ...categoryOptions,
        { label: "Show me all courses", value: "all" },
      ],
    },
    modeQuestion,
  ];
  const currentQuestion = filterQuestions[step];
  const hasAnswer = Object.prototype.hasOwnProperty.call(
    answers,
    currentQuestion.id
  );

  useEffect(() => {
    if (!isOpen) return;
    dispatch(fetchCategories());
    setStep(0);
    setAnswers({});
  }, [dispatch, isOpen]);

  const handleSelect = (value) => {
    setAnswers((prev) => ({ ...prev, [currentQuestion.id]: value }));
  };

  const handleNext = () => {
    if (step < filterQuestions.length - 1) {
      setStep((prev) => prev + 1);
      return;
    }

    const params = new URLSearchParams();
    params.set("intent", "demo");

    if (answers.category && answers.category !== "all") {
      params.set("category", answers.category);
    }

    if (answers.mode && answers.mode !== "all") {
      params.set("mode", answers.mode);
    }

    router.push(`/courses?${params.toString()}`);
    onClose?.();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/50 p-3 sm:items-center sm:p-4"
        >
          <motion.div
            initial={{ scale: 0.96, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.96, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="relative my-auto max-h-[calc(100vh-2rem)] w-full max-w-md overflow-y-auto rounded-3xl bg-white p-4 shadow-xl sm:p-6"
          >
            <button
              onClick={onClose}
              className="absolute right-4 top-4 cursor-pointer text-gray-400 transition hover:text-gray-700"
              aria-label="Close"
            >
              <LuX size={24} />
            </button>

            <div className="mt-4">
              <p className="text-sm font-medium text-orange-500">Book A Demo</p>
              <div className="mt-3 h-2 w-full rounded-full bg-gray-200">
                <motion.div
                  className="h-2 rounded-full bg-orange-500"
                  initial={{ width: 0 }}
                  animate={{
                    width: `${((step + 1) / filterQuestions.length) * 100}%`,
                  }}
                  transition={{ duration: 0.3 }}
                />
              </div>
              <p className="mt-2 text-sm text-gray-500">
                Step {step + 1} of {filterQuestions.length}
              </p>
            </div>

            <div className="mt-6">
              <h2 className="text-2xl font-bold text-gray-900">
                {currentQuestion.question}
              </h2>
              <p className="mt-2 text-sm leading-6 text-gray-500">
                {currentQuestion.description}
              </p>
            </div>

            <div className="mt-6 space-y-3">
              {currentQuestion.options.map((option) => {
                const isSelected = answers[currentQuestion.id] === option.value;
                return (
                  <label
                    key={option.value}
                    className={`flex cursor-pointer items-center gap-3 rounded-2xl border px-4 py-4 transition ${
                      isSelected
                        ? "border-orange-500 bg-orange-50"
                        : "border-gray-200 hover:border-orange-200 hover:bg-gray-50"
                    }`}
                  >
                    <input
                      type="radio"
                      name={currentQuestion.id}
                      value={option.value}
                      checked={isSelected}
                      onChange={() => handleSelect(option.value)}
                      className="h-5 w-5 cursor-pointer accent-orange-500"
                    />
                    <span className="font-medium text-gray-900">
                      {option.label}
                    </span>
                  </label>
                );
              })}
            </div>

            <div className="mt-6 flex items-center justify-between gap-3">
              <button
                type="button"
                onClick={() => {
                  if (step === 0) {
                    onClose?.();
                    return;
                  }

                  setStep((prev) => prev - 1);
                }}
                className="cursor-pointer rounded-2xl border border-gray-200 px-5 py-2.5 text-sm font-medium text-gray-600 transition hover:bg-gray-50"
              >
                {step === 0 ? "Close" : "Back"}
              </button>

              <motion.button
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.98 }}
                disabled={!hasAnswer}
                onClick={handleNext}
                className="cursor-pointer rounded-2xl bg-orange-500 px-6 py-2.5 text-sm font-semibold text-white transition hover:bg-orange-600 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {step === filterQuestions.length - 1
                  ? "Show Matching Courses"
                  : "Next"}
              </motion.button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default FilterQuestionsModal;
