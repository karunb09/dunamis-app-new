import { City, Country, State } from "country-state-city";
import { useEffect, useMemo, useState } from "react";
import {
  SelectInput,
  TextInput,
  TextareaInput,
} from "./FormFields";

const DEFAULT_COUNTRY = "IN";

export default function Step2Contact({ formData, setFormData, errors = {} }) {
  const [selectedCountry, setSelectedCountry] = useState(
    formData.country || DEFAULT_COUNTRY
  );
  const [selectedStateCode, setSelectedStateCode] = useState("");

  const states = useMemo(
    () => State.getStatesOfCountry(selectedCountry),
    [selectedCountry]
  );

  const cities = useMemo(
    () => (selectedStateCode ? City.getCitiesOfState(selectedCountry, selectedStateCode) : []),
    [selectedCountry, selectedStateCode]
  );

  useEffect(() => {
    const matchedState = states.find(
      (state) =>
        state.isoCode === formData.currentState || state.name === formData.currentState
    );

    if (matchedState) {
      setSelectedStateCode(matchedState.isoCode);
    }
  }, [formData.currentState, states]);

  return (
    <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
      <TextInput
        id="teacher-email"
        label="Email Address"
        type="email"
        placeholder="Enter your email address"
        value={formData.email}
        onChange={(e) =>
          setFormData({ ...formData, email: e.target.value })
        }
        error={errors.email}
        required
      />

      <TextInput
        id="teacher-mobile"
        label="Mobile Number"
        inputMode="numeric"
        placeholder="Enter your mobile number"
        value={formData.mobileNo}
        onChange={(e) =>
          setFormData({
            ...formData,
            mobileNo: e.target.value.replace(/\D/g, "").slice(0, 10),
          })
        }
        error={errors.mobileNo}
        required
      />

      <SelectInput
        id="teacher-country"
        label="Country"
        value={selectedCountry}
        onChange={(e) => {
          setSelectedCountry(e.target.value);
          setSelectedStateCode("");
          setFormData({
            ...formData,
            country: e.target.value,
            currentState: "",
            currentCity: "",
          });
        }}
      >
        {Country.getAllCountries().map((country) => (
          <option key={country.isoCode} value={country.isoCode}>
            {country.name}
          </option>
        ))}
      </SelectInput>

      <SelectInput
        id="teacher-state"
        label="State"
        value={selectedStateCode}
        onChange={(e) => {
          const stateCode = e.target.value;
          const selectedState = states.find((state) => state.isoCode === stateCode);
          setSelectedStateCode(stateCode);
          setFormData({
            ...formData,
            currentState: selectedState?.name || "",
            currentCity: "",
          });
        }}
        error={errors.currentState}
        required
      >
        <option value="">Select state</option>
        {states.map((state) => (
          <option key={state.isoCode} value={state.isoCode}>
            {state.name}
          </option>
        ))}
      </SelectInput>

      <SelectInput
        id="teacher-city"
        label="City"
        value={formData.currentCity}
        onChange={(e) =>
          setFormData({ ...formData, currentCity: e.target.value })
        }
        error={errors.currentCity}
        required
        disabled={!selectedStateCode}
      >
        <option value="">Select city</option>
        {cities.map((city) => (
          <option key={city.name} value={city.name}>
            {city.name}
          </option>
        ))}
      </SelectInput>

      <TextareaInput
        id="teacher-address"
        label="Current Address"
        placeholder="Enter your full current address"
        rows={4}
        value={formData.currentAddress}
        onChange={(e) =>
          setFormData({ ...formData, currentAddress: e.target.value })
        }
        error={errors.currentAddress}
        required
        className="md:col-span-2"
      />
    </div>
  );
}
