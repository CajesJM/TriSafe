import { FormEvent, ReactNode, useEffect, useId, useState } from "react";
import { ShieldCheck, X } from "lucide-react";
import { createPortal } from "react-dom";
import { api, Driver, RegisterDriverInput } from "../../api";
import {
  createDriverReceipt,
  type DriverRegistrationReceiptData,
} from "./DriverRegistrationReceipt";
import { DriverPhotoField } from "./DriverPhotoField";
import {
  DriverPresentAddressFields,
  type DriverPresentAddressValue,
} from "./DriverPresentAddressFields";
import {
  DriverRegistrationOverview,
  type DriverRegistrationDraft,
  generatedDriverUsername,
} from "./DriverRegistrationOverview";

type FormState = Omit<RegisterDriverInput, "address"> &
  DriverPresentAddressValue;
const emptyForm: FormState = {
  ownerLastName: "",
  ownerFirstName: "",
  ownerMiddleName: "",
  driverLastName: "",
  driverFirstName: "",
  driverMiddleName: "",
  accountStatus: "ACTIVE",
  phone: "",
  avatarData: "",
  vehicleType: "TRICYCLE",
  bodyNumber: "",
  permitNumber: "",
  engineNumber: "",
  chassisNumber: "",
  plateNumber: "",
  provinceCode: "0701200000",
  provinceName: "Bohol",
  municipalityCode: "",
  municipalityName: "",
  barangayCode: "",
  barangayName: "",
  purok: "",
  franchiseNumber: "",
  franchiseIssuedAt: "",
  franchiseExpiresAt: "",
};
const recordPattern = /^[A-Z0-9-]+$/;
const namePattern = /^[\p{L}][\p{L} .'-]*$/u;
const cleanName = (value: string) =>
  value
    .replace(/[^\p{L} .'-]/gu, "")
    .replace(/\s{2,}/g, " ")
    .slice(0, 60);
const cleanRecord = (value: string, length = 50) =>
  value
    .toUpperCase()
    .replace(/[^A-Z0-9-]/g, "")
    .slice(0, length);
const todayDate = () =>
  new Date(Date.now() - new Date().getTimezoneOffset() * 60000)
    .toISOString()
    .slice(0, 10);

export function DriverRegistrationForm({
  onCancel,
  onCreated,
  onError,
}: {
  onCancel: () => void;
  onCreated: (driver: Driver, receipt: DriverRegistrationReceiptData) => void;
  onError: (message: string) => void;
}) {
  const titleId = useId();
  const [form, setForm] = useState(emptyForm);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  useEffect(() => {
    const close = (event: KeyboardEvent) =>
      event.key === "Escape" && !saving && onCancel();
    document.addEventListener("keydown", close);
    return () => document.removeEventListener("keydown", close);
  }, [onCancel, saving]);
  function change(field: keyof FormState, value: string) {
    setForm((current) => ({ ...current, [field]: value }));
    setError("");
  }
  function fail(message: string) {
    setError(message);
    onError(message);
  }
  function validate() {
    const names = [
      form.ownerLastName,
      form.ownerFirstName,
      form.driverLastName,
      form.driverFirstName,
    ];
    if (names.some((name) => !namePattern.test(name.trim())))
      return "Complete the owner and driver names using letters only.";
    if (!/^9\d{9}$/.test(form.phone))
      return "Driver contact number must contain 10 digits beginning with 9 after +63.";
    const unit =
      form.vehicleType === "TRICYCLE" ? form.bodyNumber : form.permitNumber;
    if (!unit || !recordPattern.test(unit))
      return `Enter a valid ${form.vehicleType === "TRICYCLE" ? "body" : "permit"} number.`;
    if (
      ![form.engineNumber, form.chassisNumber, form.plateNumber].every(
        (value) => recordPattern.test(value),
      )
    )
      return "Complete the engine, chassis, and plate numbers using letters, numbers, and hyphens.";
    if (!form.municipalityCode || !form.barangayCode || !form.purok.trim())
      return "Complete the present Bohol address, including Purok.";
    if (
      !form.franchiseNumber ||
      !form.franchiseIssuedAt ||
      !form.franchiseExpiresAt
    )
      return "Complete the internal franchise details.";
    if (
      form.franchiseIssuedAt > todayDate() ||
      form.franchiseExpiresAt <= form.franchiseIssuedAt
    )
      return "Check the franchise issue and expiration dates.";
    return "";
  }
  async function submit(event: FormEvent) {
    event.preventDefault();
    const message = validate();
    if (message) {
      fail(message);
      return;
    }
    setSaving(true);
    try {
      const registration: RegisterDriverInput = {
        ownerLastName: form.ownerLastName.trim(),
        ownerFirstName: form.ownerFirstName.trim(),
        ownerMiddleName: form.ownerMiddleName?.trim() || undefined,
        driverLastName: form.driverLastName.trim(),
        driverFirstName: form.driverFirstName.trim(),
        driverMiddleName: form.driverMiddleName?.trim() || undefined,
        accountStatus: form.accountStatus,
        phone: `+63${form.phone}`,
        avatarData: form.avatarData || undefined,
        vehicleType: form.vehicleType,
        bodyNumber:
          form.vehicleType === "TRICYCLE" ? form.bodyNumber : undefined,
        permitNumber:
          form.vehicleType === "HABAL_HABAL" ? form.permitNumber : undefined,
        engineNumber: form.engineNumber,
        chassisNumber: form.chassisNumber,
        plateNumber: form.plateNumber,
        address: {
          provinceCode: form.provinceCode,
          provinceName: form.provinceName,
          municipalityCode: form.municipalityCode,
          municipalityName: form.municipalityName,
          barangayCode: form.barangayCode,
          barangayName: form.barangayName,
          purok: form.purok.trim(),
        },
        franchiseNumber: form.franchiseNumber,
        franchiseIssuedAt: form.franchiseIssuedAt,
        franchiseExpiresAt: form.franchiseExpiresAt,
      };
      const driver = await api.registerDriver(registration);
      onCreated(driver, createDriverReceipt(driver, registration));
    } catch (requestError) {
      fail(
        requestError instanceof Error
          ? requestError.message
          : "Unable to register the driver.",
      );
    } finally {
      setSaving(false);
    }
  }
  const username = generatedDriverUsername(
    form.driverLastName,
    form.driverFirstName,
  );
  return createPortal(
    <div
      className="driver-registration-backdrop"
      onMouseDown={(event) =>
        event.target === event.currentTarget && !saving && onCancel()
      }
    >
      <section
        className="driver-registration-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
      >
        <form className="driver-registration-form" onSubmit={submit} noValidate>
          <header className="driver-registration-header">
            <div>
              <span className="eyebrow">LGU TRANSPORT REGISTRY</span>
              <h2 id={titleId}>Register driver and vehicle</h2>
              <p>
                Create the official owner, driver, vehicle, account, and
                QR-linked transport record.
              </p>
            </div>
            <button
              type="button"
              onClick={onCancel}
              disabled={saving}
              aria-label="Close registration form"
            >
              <X />
            </button>
          </header>
          <div className="driver-registration-scroll">
            {error && (
              <div className="error driver-registration-error" role="alert">
                {error}
              </div>
            )}
            <Section
              number="01"
              title="Owner / organization leader"
              description="The owner can be connected to multiple registered member drivers."
            >
              <div className="driver-name-fields">
                <NameField
                  label="Owner last name"
                  value={form.ownerLastName}
                  onChange={(value) =>
                    change("ownerLastName", cleanName(value))
                  }
                />
                <NameField
                  label="Owner first name"
                  value={form.ownerFirstName}
                  onChange={(value) =>
                    change("ownerFirstName", cleanName(value))
                  }
                />
                <NameField
                  label="Owner middle name"
                  value={form.ownerMiddleName ?? ""}
                  onChange={(value) =>
                    change("ownerMiddleName", cleanName(value))
                  }
                  required={false}
                />
              </div>
            </Section>
            <Section
              number="02"
              title="Driver account"
              description="The driver receives a private account. Their photo is optional and never shown in public QR verification."
            >
              <DriverPhotoField
                value={form.avatarData}
                fallbackName={`${form.driverFirstName} ${form.driverLastName}`}
                onChange={(value) => change("avatarData", value)}
                onError={fail}
              />
              <div className="driver-name-fields">
                <NameField
                  label="Driver last name"
                  value={form.driverLastName}
                  onChange={(value) =>
                    change("driverLastName", cleanName(value))
                  }
                />
                <NameField
                  label="Driver first name"
                  value={form.driverFirstName}
                  onChange={(value) =>
                    change("driverFirstName", cleanName(value))
                  }
                />
                <NameField
                  label="Driver middle name"
                  value={form.driverMiddleName ?? ""}
                  onChange={(value) =>
                    change("driverMiddleName", cleanName(value))
                  }
                  required={false}
                />
              </div>
              <div className="form-grid driver-registration-grid">
                <PhoneField
                  value={form.phone}
                  onChange={(value) => change("phone", value)}
                />
                <CredentialField
                  label="Username"
                  value={username}
                  note="Generated automatically from last name and first name. Similar names receive a number only when needed."
                />
                <CredentialField
                  label="Initial password"
                  value={
                    form.vehicleType === "TRICYCLE"
                      ? form.bodyNumber || "Enter body number below"
                      : form.permitNumber || "Enter permit number below"
                  }
                  note="Set automatically to the Body Number or Permit Number. The driver should change it after first sign-in."
                />
                <label className="field">
                  <span>
                    Account status <em>*</em>
                  </span>
                  <select
                    value={form.accountStatus}
                    onChange={(event) =>
                      change("accountStatus", event.target.value)
                    }
                  >
                    <option value="ACTIVE">Active — can sign in</option>
                    <option value="INACTIVE">Inactive — sign-in blocked</option>
                  </select>
                </label>
              </div>
            </Section>
            <Section
              number="03"
              title="Present address"
              description="Official Bohol hierarchy, followed by the Purok recorded on the LGU form."
            >
              <DriverPresentAddressFields
                value={form}
                onChange={(changes) => {
                  setForm((current) => ({ ...current, ...changes }));
                  setError("");
                }}
              />
            </Section>
            <Section
              number="04"
              title="Motorcycle information"
              description="Select the vehicle type first. TriSafe then uses the correct identifying number."
            >
              <div className="form-grid driver-registration-grid">
                <label className="field">
                  <span>
                    Vehicle type <em>*</em>
                  </span>
                  <select
                    value={form.vehicleType}
                    onChange={(event) => {
                      change("vehicleType", event.target.value);
                      setForm((current) => ({
                        ...current,
                        bodyNumber: "",
                        permitNumber: "",
                      }));
                    }}
                  >
                    <option value="TRICYCLE">Tricycle</option>
                    <option value="HABAL_HABAL">Habal-habal</option>
                  </select>
                </label>
                <RecordField
                  label={
                    form.vehicleType === "TRICYCLE"
                      ? "Body number"
                      : "Permit number"
                  }
                  value={
                    form.vehicleType === "TRICYCLE"
                      ? (form.bodyNumber ?? "")
                      : (form.permitNumber ?? "")
                  }
                  onChange={(value) =>
                    change(
                      form.vehicleType === "TRICYCLE"
                        ? "bodyNumber"
                        : "permitNumber",
                      cleanRecord(value, 30),
                    )
                  }
                />
                <RecordField
                  label="Engine number"
                  value={form.engineNumber}
                  onChange={(value) =>
                    change("engineNumber", cleanRecord(value))
                  }
                />
                <RecordField
                  label="Chassis number"
                  value={form.chassisNumber}
                  onChange={(value) =>
                    change("chassisNumber", cleanRecord(value))
                  }
                />
                <RecordField
                  label="Plate number"
                  value={form.plateNumber}
                  onChange={(value) =>
                    change("plateNumber", cleanRecord(value, 15))
                  }
                />
              </div>
            </Section>
            <Section
              number="05"
              title="Internal franchise control"
              description="Used by TriSafe to enforce franchise validity, status, and QR ride eligibility."
            >
              <div className="form-grid driver-registration-grid">
                <RecordField
                  label="Franchise number"
                  value={form.franchiseNumber}
                  onChange={(value) =>
                    change("franchiseNumber", cleanRecord(value, 40))
                  }
                />
                <DateField
                  label="Issued date"
                  value={form.franchiseIssuedAt}
                  onChange={(value) => change("franchiseIssuedAt", value)}
                  max={todayDate()}
                />
                <DateField
                  label="Expiration date"
                  value={form.franchiseExpiresAt}
                  onChange={(value) => change("franchiseExpiresAt", value)}
                  min={form.franchiseIssuedAt || todayDate()}
                />
              </div>
            </Section>
          </div>
          <footer className="driver-registration-actions">
            <p>
              <ShieldCheck /> Validated against the LGU transport registry
              before creation.
            </p>
            <div>
              <button
                className="secondary"
                type="button"
                onClick={onCancel}
                disabled={saving}
              >
                Cancel
              </button>
              <button className="primary" disabled={saving} type="submit">
                {saving ? "Registering…" : "Register driver"}
              </button>
            </div>
          </footer>
        </form>
        <DriverRegistrationOverview draft={form as DriverRegistrationDraft} />
      </section>
    </div>,
    document.body,
  );
}

function Section({
  number,
  title,
  description,
  children,
}: {
  number: string;
  title: string;
  description: string;
  children: ReactNode;
}) {
  return (
    <section className="driver-form-section">
      <header>
        <span>{number}</span>
        <div>
          <h3>{title}</h3>
          <p>{description}</p>
        </div>
      </header>
      {children}
    </section>
  );
}
function NameField({
  label,
  value,
  onChange,
  required = true,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  required?: boolean;
}) {
  return (
    <label className="field">
      <span>
        {label}
        {required && <em>*</em>}
      </span>
      <input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        required={required}
        maxLength={60}
      />
    </label>
  );
}
function RecordField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="field">
      <span>
        {label} <em>*</em>
      </span>
      <input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        required
      />
    </label>
  );
}
function DateField({
  label,
  value,
  onChange,
  min,
  max,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  min?: string;
  max?: string;
}) {
  return (
    <label className="field">
      <span>
        {label} <em>*</em>
      </span>
      <input
        type="date"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        min={min}
        max={max}
        required
      />
    </label>
  );
}
function PhoneField({
  value,
  onChange,
}: {
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="field">
      <span>
        Driver contact number <em>*</em>
      </span>
      <div className="driver-phone-input">
        <b>+63</b>
        <input
          value={value}
          onChange={(event) =>
            onChange(event.target.value.replace(/\D/g, "").slice(0, 10))
          }
          inputMode="numeric"
          placeholder="9171234567"
          required
        />
      </div>
    </label>
  );
}
function CredentialField({
  label,
  value,
  note,
}: {
  label: string;
  value: string;
  note: string;
}) {
  return (
    <label className="field driver-auto-field">
      <span>
        {label} <small>Automatic</small>
      </span>
      <input value={value} readOnly aria-readonly="true" />
      <small>{note}</small>
    </label>
  );
}
