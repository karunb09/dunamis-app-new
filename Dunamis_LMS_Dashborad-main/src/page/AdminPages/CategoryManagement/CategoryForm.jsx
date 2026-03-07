import EmojiPicker from "emoji-picker-react";
import React from "react";
import { ChromePicker } from "react-color";
import { FaPlus, FaTrash } from "react-icons/fa";

const CategoryForm = ({
    categoryName,
    setCategoryName,
    subCategories = [],
    setSubCategories = () => { },
    newSubCategory = "",
    setNewSubCategory = () => { },
    selectedColor,
    setSelectedColor,
    selectedIcon,
    setSelectedIcon,
    showColorPicker,
    setShowColorPicker,
    showIconPicker,
    setShowIconPicker,
    showEmojiPicker,      
    setShowEmojiPicker,   
    colors = [],
    icons = [],
    handleAddSubCategory = () => { },
    handleRemoveSubCategory = () => { },
}) => {

    return (
        <form onSubmit={(e) => e.preventDefault()} className="space-y-6">
            <div>
                <label className="block text-sm font-medium mb-1">Category Name</label>
                <input
                    type="text"
                    placeholder="Enter category name"
                    value={categoryName}
                    onChange={(e) => setCategoryName(e.target.value)}
                    className="w-full p-2 border rounded-2xl"
                />
            </div>

            <div className="grid grid-cols-2 gap-4">
                {/* Category Icon */}
                <div>
                    <label className="block text-sm font-medium mb-1">Category Icon</label>
                    <button
                        type="button"
                        onClick={() => setShowIconPicker(!showIconPicker)}
                        className="flex items-center gap-2 px-4 py-2 bg-gray-200 rounded hover:bg-gray-300"
                    >
                        <FaPlus /> {selectedIcon ? "Change Icon" : "Add Icon"}
                    </button>

                    {showIconPicker && (
                        <div className="mt-2">
                            <EmojiPicker
                                onEmojiClick={(emojiObject, event) => {
                                    setSelectedIcon(emojiObject.emoji);
                                    setShowEmojiPicker(false);
                                }}
                            />

                        </div>
                    )}

                    {selectedIcon && <div className="mt-2 text-2xl">{selectedIcon}</div>}

                </div>

                {/* Category Color */}
                <div>
                    <label className="block text-sm font-medium mb-1">Category Color</label>
                    <button
                        type="button"
                        onClick={() => setShowColorPicker(!showColorPicker)}
                        className="flex items-center gap-2 px-4 py-2 bg-gray-200 rounded hover:bg-gray-300"
                    >
                        <FaPlus />
                        {selectedColor ? "Change Color" : "Add Color"}
                    </button>

                    {showColorPicker && (
                        <div className="mt-2 p-2 border rounded bg-gray-50 flex gap-2">
                            {showColorPicker && (
                                <div className="mt-2">
                                    <ChromePicker
                                        color={selectedColor}
                                        onChangeComplete={(color) => setSelectedColor(color.hex)}
                                    />
                                </div>
                            )}
                        </div>
                    )}
                    {selectedColor && (
                        <div className="mt-2">
                            Selected:{" "}
                            <span className="capitalize" style={{ color: selectedColor }}>
                                {selectedColor}
                            </span>
                        </div>
                    )}
                </div>
            </div>

            <div>
                <label className="block text-sm font-medium mb-1">Sub-categories</label>
                <div className="flex gap-2 mb-2">
                    <input
                        type="text"
                        placeholder="Enter sub-category"
                        value={newSubCategory}
                        onChange={(e) => setNewSubCategory(e.target.value)}
                        className="w-full p-2 border rounded-2xl"
                    />
                    <button
                        type="button"
                        onClick={handleAddSubCategory}
                        className="flex items-center gap-2 px-4 py-2 bg-gray-200 rounded hover:bg-gray-300"
                    >
                        <FaPlus /> Add
                    </button>
                </div>
                {subCategories.length > 0 && (
                    <ul className="space-y-2 text-gray-700">
                        {subCategories.map((sub, index) => (
                            <li key={index} className="flex items-center justify-between rounded-xl border bg-white px-3 py-2">
                                <span>{sub}</span>
                                <button
                                    type="button"
                                    onClick={() => handleRemoveSubCategory(index)}
                                    className="text-red-500 hover:text-red-700"
                                    aria-label={`Remove ${sub}`}
                                >
                                    <FaTrash />
                                </button>
                            </li>
                        ))}
                    </ul>
                )}
            </div>
        </form>
    );
};

export default CategoryForm;
