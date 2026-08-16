import { useEffect, useId, useMemo, useRef, useState } from "react";
import {
  CheckCircle2,
  ChevronDown,
  LoaderCircle,
  MapPin,
  Search,
} from "lucide-react";
import {
  api,
  type PhilippineLocationOption,
  type RegisterDriverInput,
  type StreetLocationSuggestion,
} from "../../api";

export type DriverLocationField =
  | "provinceCode"
  | "provinceName"
  | "municipalityCode"
  | "municipalityName"
  | "barangayCode"
  | "barangayName"
  | "streetPurok"
  | "postalCode"
  | "streetPlaceId"
  | "addressLatitude"
  | "addressLongitude";

type LocationValue = Pick<RegisterDriverInput, DriverLocationField>;

export function DriverLocationFields({
  value,
  onChange,
  readOnly = false,
}: {
  value: LocationValue;
  onChange: (changes: Partial<LocationValue>) => void;
  readOnly?: boolean;
}) {
  const [municipalities, setMunicipalities] = useState<
    PhilippineLocationOption[]
  >([]);
  const [barangays, setBarangays] = useState<PhilippineLocationOption[]>([]);
  const [suggestions, setSuggestions] = useState<StreetLocationSuggestion[]>(
    [],
  );
  const [directoryError, setDirectoryError] = useState("");
  const [loadingMunicipalities, setLoadingMunicipalities] = useState(true);
  const [loadingBarangays, setLoadingBarangays] = useState(false);
  const [searchingStreet, setSearchingStreet] = useState(false);

  useEffect(() => {
    let active = true;
    api
      .boholMunicipalities()
      .then((items) => {
        if (active) setMunicipalities(items);
      })
      .catch(() => {
        if (active)
          setDirectoryError(
            "The Bohol location directory could not be loaded.",
          );
      })
      .finally(() => {
        if (active) setLoadingMunicipalities(false);
      });
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
    setDirectoryError("");
    api
      .boholBarangays(value.municipalityCode)
      .then((items) => {
        if (active) setBarangays(items);
      })
      .catch(() => {
        if (active)
          setDirectoryError(
            "Barangays for this municipality could not be loaded.",
          );
      })
      .finally(() => {
        if (active) setLoadingBarangays(false);
      });
    return () => {
      active = false;
    };
  }, [value.municipalityCode]);

  useEffect(() => {
    const query = value.streetPurok.trim();
    if (!value.barangayCode || query.length < 2 || value.streetPlaceId) {
      setSuggestions([]);
      setSearchingStreet(false);
      return;
    }
    let active = true;
    const timer = window.setTimeout(() => {
      setSearchingStreet(true);
      setDirectoryError("");
      api
        .boholStreetSuggestions(
          value.municipalityCode,
          value.barangayCode,
          query,
        )
        .then((items) => {
          if (active) setSuggestions(items);
        })
        .catch(() => {
          if (active)
            setDirectoryError(
              "Street/Purok suggestions are temporarily unavailable.",
            );
        })
        .finally(() => {
          if (active) setSearchingStreet(false);
        });
    }, 450);
    return () => {
      active = false;
      window.clearTimeout(timer);
    };
  }, [
    value.barangayCode,
    value.municipalityCode,
    value.streetPlaceId,
    value.streetPurok,
  ]);

  function selectMunicipality(code: string) {
    const selected = municipalities.find((item) => item.code === code);
    onChange({
      municipalityCode: selected?.code ?? "",
      municipalityName: selected?.name ?? "",
      barangayCode: "",
      barangayName: "",
      streetPurok: "",
      streetPlaceId: "",
      postalCode: "",
      addressLatitude: 0,
      addressLongitude: 0,
    });
    setSuggestions([]);
  }

  function selectBarangay(code: string) {
    const selected = barangays.find((item) => item.code === code);
    onChange({
      barangayCode: selected?.code ?? "",
      barangayName: selected?.name ?? "",
      streetPurok: "",
      streetPlaceId: "",
      postalCode: "",
      addressLatitude: 0,
      addressLongitude: 0,
    });
    setSuggestions([]);
  }

  function selectStreet(item: StreetLocationSuggestion) {
    onChange({
      streetPurok: item.name,
      streetPlaceId: item.id,
      postalCode: item.postalCode,
      addressLatitude: item.latitude,
      addressLongitude: item.longitude,
    });
    setSuggestions([]);
  }

  return (
    <div className="driver-location-fields">
      {directoryError && (
        <div className="driver-location-error" role="alert">
          {directoryError}
        </div>
      )}
      <div className="driver-location-grid">
        <label className="field">
          <span>
            Province <em>*</em>
          </span>
          <select value={value.provinceCode} disabled aria-label="Province">
            <option value="0701200000">Bohol</option>
          </select>
          <small>Registration is currently limited to Bohol.</small>
        </label>

        <SearchableHierarchyField
          label="Municipality/City"
          searchLabel="Search Bohol municipalities"
          value={value.municipalityCode}
          options={municipalities}
          disabled={readOnly || loadingMunicipalities}
          loading={loadingMunicipalities}
          onSelect={selectMunicipality}
        />

        <SearchableHierarchyField
          label="Barangay"
          searchLabel="Search barangays"
          value={value.barangayCode}
          options={barangays}
          disabled={readOnly || !value.municipalityCode || loadingBarangays}
          loading={loadingBarangays}
          onSelect={selectBarangay}
        />

        <label className="field driver-street-field">
          <span>
            Street/Purok <em>*</em>
          </span>
          <div
            className={`driver-location-search ${value.streetPlaceId ? "verified" : ""}`}
          >
            <MapPin aria-hidden="true" />
            <input
              value={value.streetPurok}
              disabled={readOnly || !value.barangayCode}
              placeholder={
                value.barangayCode
                  ? "Search a street or purok"
                  : "Select a barangay first"
              }
              autoComplete="off"
              role="combobox"
              aria-expanded={suggestions.length > 0}
              aria-controls="driver-street-suggestions"
              onChange={(event) =>
                onChange({
                  streetPurok: event.target.value
                    .replace(/\s{2,}/g, " ")
                    .slice(0, 140),
                  streetPlaceId: "",
                  postalCode: "",
                  addressLatitude: 0,
                  addressLongitude: 0,
                })
              }
              required
            />
            {searchingStreet && (
              <LoaderCircle
                className="driver-location-spinner"
                aria-label="Searching locations"
              />
            )}
            {value.streetPlaceId && (
              <CheckCircle2
                className="driver-location-verified"
                aria-label="Verified map location"
              />
            )}
          </div>
          {suggestions.length > 0 && (
            <div
              className="driver-location-suggestions"
              id="driver-street-suggestions"
              role="listbox"
            >
              {suggestions.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  role="option"
                  onClick={() => selectStreet(item)}
                >
                  <MapPin aria-hidden="true" />
                  <span>
                    <strong>{item.name}</strong>
                    <small>{item.label}</small>
                  </span>
                  <b>{item.postalCode}</b>
                </button>
              ))}
            </div>
          )}
          <small>
            {value.streetPlaceId
              ? "Verified against OpenStreetMap location data."
              : "Type at least two characters and select a verified suggestion."}
          </small>
        </label>

        <label className="field driver-postal-field">
          <span>
            Postal/ZIP code <em>*</em>
          </span>
          <input
            value={value.postalCode}
            readOnly
            inputMode="numeric"
            placeholder="Generated automatically"
            pattern="\d{4}"
          />
          <small>Automatically inserted from the verified location.</small>
        </label>
      </div>
    </div>
  );
}

export const BoholAddressFields = DriverLocationFields;
export type BoholAddressField = DriverLocationField;

function SearchableHierarchyField({
  label,
  searchLabel,
  value,
  options,
  disabled,
  loading,
  onSelect,
}: {
  label: string;
  searchLabel: string;
  value: string;
  options: PhilippineLocationOption[];
  disabled: boolean;
  loading: boolean;
  onSelect: (code: string) => void;
}) {
  const listId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);
  const selected = options.find((item) => item.code === value);
  const filteredOptions = useMemo(
    () => filterOptions(options, query),
    [options, query],
  );

  useEffect(() => {
    setQuery("");
    setOpen(false);
    setActiveIndex(0);
  }, [value]);

  useEffect(() => {
    function closeOnOutsideClick(event: PointerEvent) {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
        setQuery("");
      }
    }
    document.addEventListener("pointerdown", closeOnOutsideClick);
    return () =>
      document.removeEventListener("pointerdown", closeOnOutsideClick);
  }, []);

  useEffect(() => {
    if (!open) return;
    document
      .getElementById(`${listId}-${filteredOptions[activeIndex]?.code}`)
      ?.scrollIntoView({ block: "nearest" });
  }, [activeIndex, filteredOptions, listId, open]);

  function choose(code: string) {
    onSelect(code);
    setOpen(false);
    setQuery("");
    setActiveIndex(0);
  }

  return (
    <div className="field driver-hierarchy-field" ref={rootRef}>
      <span>
        {label} <em>*</em>
      </span>
      <div className={`driver-location-combobox ${open ? "open" : ""}`}>
        <Search aria-hidden="true" />
        <input
          value={open ? query : (selected?.name ?? "")}
          disabled={disabled}
          placeholder={loading ? "Loading official locations…" : searchLabel}
          onFocus={() => {
            setQuery("");
            setOpen(true);
            setActiveIndex(0);
          }}
          onChange={(event) => {
            setQuery(event.target.value.slice(0, 80));
            setOpen(true);
            setActiveIndex(0);
          }}
          onKeyDown={(event) => {
            if (event.key === "ArrowDown") {
              event.preventDefault();
              setOpen(true);
              setActiveIndex((index) =>
                Math.min(index + 1, Math.max(0, filteredOptions.length - 1)),
              );
            } else if (event.key === "ArrowUp") {
              event.preventDefault();
              setActiveIndex((index) => Math.max(index - 1, 0));
            } else if (
              event.key === "Enter" &&
              open &&
              filteredOptions[activeIndex]
            ) {
              event.preventDefault();
              choose(filteredOptions[activeIndex].code);
            } else if (event.key === "Escape") {
              setOpen(false);
              setQuery("");
            }
          }}
          autoComplete="off"
          aria-label={searchLabel}
          role="combobox"
          aria-autocomplete="list"
          aria-expanded={open}
          aria-controls={listId}
          aria-activedescendant={
            open && filteredOptions[activeIndex]
              ? `${listId}-${filteredOptions[activeIndex].code}`
              : undefined
          }
          required
        />
        {loading ? (
          <LoaderCircle
            className="driver-location-spinner"
            aria-label="Loading locations"
          />
        ) : (
          <button
            type="button"
            tabIndex={-1}
            disabled={disabled}
            aria-label={`${open ? "Close" : "Open"} ${label} options`}
            onMouseDown={(event) => event.preventDefault()}
            onClick={() => {
              setQuery("");
              setOpen((current) => !current);
              setActiveIndex(0);
            }}
          >
            <ChevronDown aria-hidden="true" />
          </button>
        )}
      </div>
      {open && !disabled && (
        <div className="driver-hierarchy-options" id={listId} role="listbox">
          {filteredOptions.length > 0 ? (
            filteredOptions.map((item, index) => (
              <button
                id={`${listId}-${item.code}`}
                key={item.code}
                type="button"
                role="option"
                aria-selected={item.code === value}
                className={`${item.code === value ? "selected" : ""} ${index === activeIndex ? "active" : ""}`}
                onMouseDown={(event) => event.preventDefault()}
                onMouseEnter={() => setActiveIndex(index)}
                onClick={() => choose(item.code)}
              >
                <span>{item.name}</span>
                {item.code === value && <CheckCircle2 aria-hidden="true" />}
              </button>
            ))
          ) : (
            <p>No matching {label.toLowerCase()} found.</p>
          )}
        </div>
      )}
      <small>
        {selected
          ? `${selected.name} selected.`
          : `${options.length} official option${options.length === 1 ? "" : "s"} available.`}
      </small>
    </div>
  );
}

function filterOptions(options: PhilippineLocationOption[], query: string) {
  const normalized = query.trim().toLocaleLowerCase();
  return normalized
    ? options.filter((item) =>
        item.name.toLocaleLowerCase().includes(normalized),
      )
    : options;
}
