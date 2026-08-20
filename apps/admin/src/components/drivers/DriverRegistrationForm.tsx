import { FormEvent, ReactNode, useEffect, useId, useState } from "react";
import { Eye, EyeOff, ShieldCheck, X } from "lucide-react";
import { createPortal } from "react-dom";
import { api, Driver, RegisterDriverInput } from "../../api";
import {
  createDriverReceipt,
  type DriverRegistrationReceiptData,
} from "./DriverRegistrationReceipt";
import {
  DriverPresentAddressFields,
  type DriverPresentAddressValue,
} from "./DriverPresentAddressFields";

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
  temporaryPassword: "",
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
const passwordPattern = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).+$/;
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
  const [showPassword, setShowPassword] = useState(false);
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
    if (
      form.temporaryPassword.length < 10 ||
      !passwordPattern.test(form.temporaryPassword)
    )
      return "Temporary password must contain uppercase, lowercase, number, and symbol.";
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
      setError(message);
      onError(message);
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
        temporaryPassword: form.temporaryPassword,
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
      const message =
        requestError instanceof Error
          ? requestError.message
          : "Unable to register the driver.";
      setError(message);
      onError(message);
    } finally {
      setSaving(false);
    }
  }

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
                Record the official owner, member driver, present address, and
                motorcycle identity.
              </p>
            </div>
            <button
              type="button"
              onClick={onCancel}
              disabled={saving}
              aria-label="Close"
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
              description="One owner record can be linked to multiple member drivers."
            >
              <div className="driver-name-fields">
                <NameField
                  label="Owner last name"
                  value={form.ownerLastName}
                  onChange={(v) => change("ownerLastName", cleanName(v))}
                />
                <NameField
                  label="Owner first name"
                  value={form.ownerFirstName}
                  onChange={(v) => change("ownerFirstName", cleanName(v))}
                />
                <NameField
                  label="Owner middle name"
                  value={form.ownerMiddleName ?? ""}
                  onChange={(v) => change("ownerMiddleName", cleanName(v))}
                  required={false}
                />
              </div>
            </Section>
            <Section
              number="02"
              title="Driver and account"
              description="The actual member driver receives the TriSafe login account."
            >
              <div className="driver-name-fields">
                <NameField
                  label="Driver last name"
                  value={form.driverLastName}
                  onChange={(v) => change("driverLastName", cleanName(v))}
                />
                <NameField
                  label="Driver first name"
                  value={form.driverFirstName}
                  onChange={(v) => change("driverFirstName", cleanName(v))}
                />
                <NameField
                  label="Driver middle name"
                  value={form.driverMiddleName ?? ""}
                  onChange={(v) => change("driverMiddleName", cleanName(v))}
                  required={false}
                />
              </div>
              <div className="form-grid driver-registration-grid">
                <PhoneField
                  value={form.phone}
                  onChange={(v) => change("phone", v)}
                />
                <label className="field">
                  <span>
                    Temporary password <em>*</em>
                  </span>
                  <div className="driver-password-input">
                    <input
                      type={showPassword ? "text" : "password"}
                      value={form.temporaryPassword}
                      onChange={(e) =>
                        change("temporaryPassword", e.target.value.slice(0, 72))
                      }
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((v) => !v)}
                    >
                      {showPassword ? <EyeOff /> : <Eye />}
                    </button>
                  </div>
                  <small>The Body or Permit Number becomes the username.</small>
                </label>
                <label className="field">
                  <span>
                    Account status <em>*</em>
                  </span>
                  <select
                    value={form.accountStatus}
                    onChange={(e) => change("accountStatus", e.target.value)}
                  >
                    <option value="ACTIVE">Active</option>
                    <option value="INACTIVE">Inactive</option>
                  </select>
                </label>
              </div>
            </Section>
            <Section
              number="03"
              title="Present address"
              description="Official Bohol hierarchy with the Purok written on the LGU form."
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
              description="The unit number changes according to the selected vehicle type."
            >
              <div className="form-grid driver-registration-grid">
                <label className="field">
                  <span>
                    Vehicle type <em>*</em>
                  </span>
                  <select
                    value={form.vehicleType}
                    onChange={(e) => {
                      change("vehicleType", e.target.value);
                      setForm((c) => ({
                        ...c,
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
                  onChange={(v) =>
                    change(
                      form.vehicleType === "TRICYCLE"
                        ? "bodyNumber"
                        : "permitNumber",
                      cleanRecord(v, 30),
                    )
                  }
                />
                <RecordField
                  label="Engine number"
                  value={form.engineNumber}
                  onChange={(v) => change("engineNumber", cleanRecord(v))}
                />
                <RecordField
                  label="Chassis number"
                  value={form.chassisNumber}
                  onChange={(v) => change("chassisNumber", cleanRecord(v))}
                />
                <RecordField
                  label="Plate number"
                  value={form.plateNumber}
                  onChange={(v) => change("plateNumber", cleanRecord(v, 15))}
                />
              </div>
            </Section>
            <Section
              number="05"
              title="Internal franchise control"
              description="Retained for QR eligibility and expiration enforcement; not part of the driver identity."
            >
              <div className="form-grid driver-registration-grid">
                <RecordField
                  label="Franchise number"
                  value={form.franchiseNumber}
                  onChange={(v) =>
                    change("franchiseNumber", cleanRecord(v, 40))
                  }
                />
                <DateField
                  label="Issued date"
                  value={form.franchiseIssuedAt}
                  onChange={(v) => change("franchiseIssuedAt", v)}
                  max={todayDate()}
                />
                <DateField
                  label="Expiration date"
                  value={form.franchiseExpiresAt}
                  onChange={(v) => change("franchiseExpiresAt", v)}
                  min={form.franchiseIssuedAt || todayDate()}
                />
              </div>
            </Section>
          </div>
          <footer className="driver-registration-actions">
            <p>
              <ShieldCheck /> All records are validated before creation.
            </p>
            <div>
              <button className="secondary" type="button" onClick={onCancel}>
                Cancel
              </button>
              <button className="primary" disabled={saving} type="submit">
                {saving ? "Registering…" : "Register driver"}
              </button>
            </div>
          </footer>
        </form>
        <aside className="driver-registration-help">
          <span className="driver-registration-help-icon">
            <ShieldCheck />
          </span>
          <span className="eyebrow">OFFICIAL LGU RECORD</span>
          <h3>Owner, driver, and vehicle—correctly separated</h3>
          <p>
            The Body or Permit Number identifies the driver account while the QR
            remains linked to the registered vehicle.
          </p>
        </aside>
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
  onChange: (v: string) => void;
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
        onChange={(e) => onChange(e.target.value)}
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
  onChange: (v: string) => void;
}) {
  return (
    <label className="field">
      <span>
        {label} <em>*</em>
      </span>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
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
  onChange: (v: string) => void;
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
        onChange={(e) => onChange(e.target.value)}
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
  onChange: (v: string) => void;
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
          onChange={(e) =>
            onChange(e.target.value.replace(/\D/g, "").slice(0, 10))
          }
          inputMode="numeric"
          placeholder="9171234567"
          required
        />
      </div>
    </label>
  );
}
