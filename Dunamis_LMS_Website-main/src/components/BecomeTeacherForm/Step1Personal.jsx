import {
  SelectInput,
  TextInput,
} from "./FormFields";

export default function Step1Personal({ formData, setFormData, errors = {} }) {
  return (
    <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
      <TextInput
        id="teacher-first-name"
        label="First Name"
        placeholder="Enter your first name"
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
    </div>
  );
}
