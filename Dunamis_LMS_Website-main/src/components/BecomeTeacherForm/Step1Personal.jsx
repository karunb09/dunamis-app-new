import {
  SelectInput,
  TextInput,
} from "./FormFields";
import { TEACHING_LANGUAGES } from "@/lib/languages";

export default function Step1Personal({ formData, setFormData, errors = {} }) {
  return (
    <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
      <TextInput
        id="teacher-first-name"
        label="First Name"
        placeholder="Enter your first name"
        autoComplete="given-name"
        value={formData.firstName}
        onChange={(e) =>
          setFormData({ ...formData, firstName: e.target.value })
        }
        error={errors.firstName}
        required
      />

      <TextInput
        id="teacher-last-name"
        label="Last Name"
        placeholder="Enter your last name"
        autoComplete="family-name"
        value={formData.lastName}
        onChange={(e) =>
          setFormData({ ...formData, lastName: e.target.value })
        }
        error={errors.lastName}
        required
      />

      <SelectInput
        id="teacher-gender"
        label="Gender"
        value={formData.gender}
        onChange={(e) =>
          setFormData({ ...formData, gender: e.target.value })
        }
        error={errors.gender}
        required
      >
        <option value="">Select gender</option>
        <option value="male">Male</option>
        <option value="female">Female</option>
        <option value="other">Other</option>
      </SelectInput>

      <TextInput
        id="teacher-dob"
        label="Date of Birth"
        type="date"
        autoComplete="bday"
        value={formData.dob}
        onChange={(e) =>
          setFormData({ ...formData, dob: e.target.value })
        }
        error={errors.dob}
      />

      <TextInput
        id="teacher-read-language"
        label="Languages You Can Read"
        placeholder="English, Hindi"
        value={formData.readLanguage}
        onChange={(e) =>
          setFormData({ ...formData, readLanguage: e.target.value })
        }
        error={errors.readLanguage}
        required
        className="md:col-span-2"
      />

      <TextInput
        id="teacher-speak-language"
        label="Languages You Can Speak"
        placeholder="English, Hindi"
        value={formData.speakLanguage}
        onChange={(e) =>
          setFormData({ ...formData, speakLanguage: e.target.value })
        }
        error={errors.speakLanguage}
        required
        className="md:col-span-2"
      />

      <div className="md:col-span-2">
        <label className="mb-1.5 block text-sm font-medium text-gray-700">
          Languages You Teach In <span className="text-red-500">*</span>
        </label>
        <div className="flex flex-wrap gap-2 rounded-2xl border border-gray-200 p-3">
          {TEACHING_LANGUAGES.map((language) => {
            const isSelected = (formData.teachLanguage || []).includes(language);
            return (
              <button
                key={language}
                type="button"
                onClick={() =>
                  setFormData({
                    ...formData,
                    teachLanguage: isSelected
                      ? formData.teachLanguage.filter((item) => item !== language)
                      : [...(formData.teachLanguage || []), language],
                  })
                }
                className={`rounded-full border px-3 py-1.5 text-sm font-medium transition ${
                  isSelected
                    ? "border-orange-500 bg-orange-500 text-white"
                    : "border-gray-300 bg-white text-gray-700 hover:border-orange-300 hover:bg-orange-50"
                }`}
              >
                {language}
              </button>
            );
          })}
        </div>
        {errors.teachLanguage ? (
          <p className="mt-1 text-sm text-red-500">{errors.teachLanguage}</p>
        ) : null}
      </div>
    </div>
  );
}
