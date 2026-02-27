import React, { useState, useEffect } from "react";

const PricingForm = ({ pricing: propPricing, setPricing }) => {
    // Define default pricing structure
    const defaultPricing = {
        standard: {
            enabled: false,
            monthlyFee: "",
            fullPayment: "",
            discount: "",
            totalInstallments: "",
        },
        premium: {
            enabled: false,
            monthlyFee: "",
            fullPayment: "",
            discount: "",
            totalInstallments: "",
        },
    };


    // Initialize sessions with propPricing if valid, else use default
    const [sessions, setSessions] = useState(
        propPricing && Object.keys(propPricing).length > 0
            ? propPricing
            : defaultPricing
    );

    // Sync sessions with propPricing changes
    useEffect(() => {
        if (propPricing && Object.keys(propPricing).length > 0) {
            setSessions(propPricing);
        } else {
            setSessions(defaultPricing);
        }
    }, [propPricing]);

    const handleToggle = (type) => {
        const newSessions = {
            ...sessions,
            [type]: {
                ...sessions[type],
                enabled: !sessions[type].enabled,
            },
        };
        setSessions(newSessions);
        setPricing(newSessions);
    };

    const handleChange = (type, field, value) => {
        const newSessions = {
            ...sessions,
            [type]: {
                ...sessions[type],
                [field]: value,
            },
        };
        setSessions(newSessions);
        setPricing(newSessions);
    };

    const renderSessionInputs = (type, label) => (
        <div className="col-span-full mt-6">
            <div className="flex items-center gap-2 mb-2">
                <input
                    id={`${type}-enabled`}
                    type="checkbox"
                    checked={sessions[type].enabled}
                    onChange={() => handleToggle(type)}
                />
                <label
                    htmlFor={`${type}-enabled`}
                    className="text-sm font-medium text-gray-700 cursor-pointer"
                >
                    {label} Session
                </label>
            </div>

            <div className="grid grid-cols-2 gap-4">
                <div>
                    <label
                        htmlFor={`${type}-monthlyFee`}
                        className="block text-sm font-medium mb-1"
                    >
                        Monthly Fee
                    </label>
                    <input
                        id={`${type}-monthlyFee`}
                        type="number"
                        min="0"
                        step="0.01"
                        disabled={!sessions[type].enabled}
                        value={sessions[type].monthlyFee}
                        onChange={(e) => handleChange(type, "monthlyFee", e.target.value)}
                        className={`w-full border px-3 py-2 rounded-2xl ${sessions[type].enabled ? "bg-white" : "bg-gray-200 cursor-not-allowed"
                            }`}
                    />
                </div>

                <div>
                    <label
                        htmlFor={`${type}-fullPayment`}
                        className="block text-sm font-medium mb-1"
                    >
                        Full Payment
                    </label>
                    <input
                        id={`${type}-fullPayment`}
                        type="number"
                        min="0"
                        step="0.01"
                        disabled={!sessions[type].enabled}
                        value={sessions[type].fullPayment}
                        onChange={(e) => handleChange(type, "fullPayment", e.target.value)}
                        className={`w-full border px-3 py-2 rounded-2xl ${sessions[type].enabled ? "bg-white" : "bg-gray-200 cursor-not-allowed"
                            }`}
                    />
                </div>

                <div>
                    <label
                        htmlFor={`${type}-discount`}
                        className="block text-sm font-medium mb-1"
                    >
                        Discount
                    </label>
                    <input
                        id={`${type}-discount`}
                        type="number"
                        min="0"
                        step="0.01"
                        disabled={!sessions[type].enabled}
                        value={sessions[type].discount}
                        onChange={(e) => handleChange(type, "discount", e.target.value)}
                        className={`w-full border px-3 py-2 rounded-2xl ${sessions[type].enabled ? "bg-white" : "bg-gray-200 cursor-not-allowed"
                            }`}
                    />
                </div>

                <div>
                    <label
                        htmlFor={`${type}-installments`}
                        className="block text-sm font-medium mb-1"
                    >
                        Installments
                    </label>
                    <input
                        type="number"
                        min="1"
                        disabled={!sessions[type].enabled}
                        value={sessions[type].totalInstallments}
                        onChange={(e) => handleChange(type, "totalInstallments", e.target.value)}
                        className={`w-full border px-3 py-2 rounded-2xl ${sessions[type].enabled ? "bg-white" : "bg-gray-200 cursor-not-allowed"}`}
                    />

                </div>
            </div>
        </div>
    );


    return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {renderSessionInputs("standard", "Standard")}
            {renderSessionInputs("premium", "Premium")}
        </div>
    );
};

export default PricingForm;