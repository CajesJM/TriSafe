import { useEffect, useState } from "react";
import { api, type PhilippineLocationOption } from "../../api";
import { SearchableHierarchyField } from "./DriverLocationFields";

export type DriverPresentAddressValue = {
  provinceCode: string;
  provinceName: string;
  municipalityCode: string;
  municipalityName: string;
  barangayCode: string;
  barangayName: string;
  purok: string;
};

export function DriverPresentAddressFields({
  value,
  onChange,
}: {
  value: DriverPresentAddressValue;
  onChange: (changes: Partial<DriverPresentAddressValue>) => void;
}) {
  const [municipalities, setMunicipalities] = useState<
    PhilippineLocationOption[]
  >([]);
  const [barangays, setBarangays] = useState<PhilippineLocationOption[]>([]);
  const [loadingMunicipalities, setLoadingMunicipalities] = useState(true);
  const [loadingBarangays, setLoadingBarangays] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    api
      .boholMunicipalities()
      .then((items) => active && setMunicipalities(items))
      .catch(
        () =>
          active &&
          setError("Unable to load the Bohol municipality directory."),
      )
      .finally(() => active && setLoadingMunicipalities(false));
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!value.municipalityCode) {
      setBarangays([]);
      return;
    }
    let active = true;
    setLoadingBarangays(true);
    api
      .boholBarangays(value.municipalityCode)
      .then((items) => active && setBarangays(items))
      .catch(
        () =>
          active && setError("Unable to load barangays for this municipality."),
      )
      .finally(() => active && setLoadingBarangays(false));
    return () => {
      active = false;
    };
  }, [value.municipalityCode]);

  return (
    <div className="driver-location-fields">
      {error && (
        <div className="driver-location-error" role="alert">
          {error}
        </div>
      )}
      <div className="driver-location-grid">
        <label className="field">
          <span>
            Province <em>*</em>
          </span>
          <input value="Bohol" readOnly />
          <small>Driver registration is currently limited to Bohol.</small>
        </label>
        <SearchableHierarchyField
          label="Municipality/City"
          searchLabel="Search Bohol municipalities"
          value={value.municipalityCode}
          options={municipalities}
          disabled={loadingMunicipalities}
          loading={loadingMunicipalities}
          onSelect={(code) => {
            const selected = municipalities.find((item) => item.code === code);
            onChange({
              municipalityCode: code,
              municipalityName: selected?.name ?? "",
              barangayCode: "",
              barangayName: "",
              purok: "",
            });
          }}
        />
        <SearchableHierarchyField
          label="Barangay"
          searchLabel="Search barangays"
          value={value.barangayCode}
          options={barangays}
          disabled={!value.municipalityCode || loadingBarangays}
          loading={loadingBarangays}
          onSelect={(code) => {
            const selected = barangays.find((item) => item.code === code);
            onChange({
              barangayCode: code,
              barangayName: selected?.name ?? "",
              purok: "",
            });
          }}
        />
        <label className="field">
          <span>
            Purok <em>*</em>
          </span>
          <input
            value={value.purok}
            onChange={(event) =>
              onChange({
                purok: event.target.value.replace(/\s{2,}/g, " ").slice(0, 100),
              })
            }
            placeholder="Enter the present purok"
            required
          />
          <small>Use the purok recorded on the LGU application.</small>
        </label>
      </div>
    </div>
  );
}
