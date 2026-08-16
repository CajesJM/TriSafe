import { FormEvent, ReactNode, useEffect, useId, useState } from "react";
import { CheckCircle2, Eye, EyeOff, Info, ShieldCheck, X } from "lucide-react";
import { createPortal } from "react-dom";
import { api, Driver, RegisterDriverInput } from "../../api";
import {
  createDriverReceipt,
  type DriverRegistrationReceiptData,
} from "./DriverRegistrationReceipt";
import {
  cleanPersonNamePart,
  cleanMiddleInitial,
  formatPersonName,
  validatePersonName,
} from "../../utils/personName";
import { DriverLocationFields, type DriverLocationField } from "./DriverLocationFields";

type DriverFormState = Omit<RegisterDriverInput, "fullName"> & {
  lastName: string;
  firstName: string;
  middleInitial: string;
};

const emptyDriverForm: DriverFormState = {
  lastName: "",
  firstName: "",
  middleInitial: "",
  provinceCode: "0701200000",
  provinceName: "Bohol",
  municipalityCode: "",
  municipalityName: "",
  barangayCode: "",
  barangayName: "",
  streetPurok: "",
  postalCode: "",
  streetPlaceId: "",
  addressLatitude: 0,
  addressLongitude: 0,
  accountStatus: "ACTIVE",
  phone: "",
  email: "",
  temporaryPassword: "",
  licenseNumber: "",
  renewalDate: "",
  franchiseNumber: "",
  franchiseIssuedAt: "",
  franchiseExpiresAt: "",
  plateNumber: "",
  vehicleType: "TRICYCLE",
};

const recordPattern = /^[A-Z0-9-]+$/;
const passwordPattern = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).+$/;

function todayDate() {
  const now = new Date();
  const offset = now.getTimezoneOffset() * 60_000;
  return new Date(now.getTime() - offset).toISOString().slice(0, 10);
}

function cleanRecordValue(value: string, maxLength: number) {
  return value.toUpperCase().replace(/[^A-Z0-9-]/g, "").slice(0, maxLength);
}

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
  const [form, setForm] = useState<DriverFormState>(emptyDriverForm);
  const [formError, setFormError] = useState("");
  const [saving, setSaving] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === "Escape" && !saving) onCancel();
    }
    document.addEventListener("keydown", closeOnEscape);
    return () => document.removeEventListener("keydown", closeOnEscape);
  }, [onCancel, saving]);

  function updateField(field: keyof DriverFormState, value: string) {
    setFormError("");
    setForm((current) => ({ ...current, [field]: value }));
  }

  function updateLocation(
    changes: Partial<Pick<DriverFormState, DriverLocationField>>,
  ) {
    setFormError("");
    setForm((current) => ({ ...current, ...changes }));
  }

  function validate() {
    const nameError = validatePersonName(form);
    if (nameError) return nameError;
    if (form.provinceCode !== "0701200000" || form.provinceName !== "Bohol")
      return "Driver registration currently supports Bohol addresses only.";
    if (!form.municipalityCode || !form.municipalityName)
      return "Select the driver's municipality or city.";
    if (!form.barangayCode || !form.barangayName)
      return "Select the driver's barangay.";
    if (/\d/.test(form.barangayName))
      return "Barangay names cannot contain numbers.";
    if (!form.streetPurok.trim() || !form.streetPlaceId)
      return "Search and select a verified Street/Purok suggestion.";
    if (!/^\d{4}$/.test(form.postalCode))
      return "A valid 4-digit postal/ZIP code is required.";
    if (!Number.isFinite(form.addressLatitude) || !Number.isFinite(form.addressLongitude))
      return "The selected location coordinates are invalid.";
    if (!/^9\d{9}$/.test(form.phone))
      return "Mobile number must contain 10 digits and begin with 9 after +63.";
    if (form.email.includes(" ") || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim()))
      return "Enter a valid email address without spaces.";
    if (form.temporaryPassword.length < 10 || form.temporaryPassword.length > 72 || !passwordPattern.test(form.temporaryPassword))
      return "Temporary password must be 10–72 characters with uppercase, lowercase, number, and symbol.";
    if (!recordPattern.test(form.licenseNumber) || form.licenseNumber.length < 4)
      return "Enter a valid license number using letters, numbers, and hyphens.";
    if (!recordPattern.test(form.franchiseNumber) || form.franchiseNumber.length < 4)
      return "Enter a valid franchise number using letters, numbers, and hyphens.";
    if (!recordPattern.test(form.plateNumber) || form.plateNumber.length < 3)
      return "Enter a valid plate number using letters, numbers, and hyphens.";
    if (!form.renewalDate || !form.franchiseIssuedAt || !form.franchiseExpiresAt)
      return "Complete all required dates.";
    const today = todayDate();
    if (form.renewalDate < today) return "The license renewal date cannot be in the past.";
    if (form.franchiseIssuedAt > today) return "The franchise issued date cannot be in the future.";
    if (form.franchiseExpiresAt <= form.franchiseIssuedAt)
      return "The franchise expiration date must be after its issued date.";
    if (form.franchiseExpiresAt <= today)
      return "The franchise expiration date must be in the future.";
    return "";
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const validationError = validate();
    if (validationError) {
      setFormError(validationError);
      onError(validationError);
      return;
    }

    setFormError("");
    setSaving(true);
    try {
      const registration: RegisterDriverInput = {
        accountStatus: form.accountStatus,
        phone: `+63${form.phone}`,
        email: form.email.trim().toLowerCase(),
        temporaryPassword: form.temporaryPassword,
        licenseNumber: form.licenseNumber,
        renewalDate: form.renewalDate,
        franchiseNumber: form.franchiseNumber,
        franchiseIssuedAt: form.franchiseIssuedAt,
        franchiseExpiresAt: form.franchiseExpiresAt,
        plateNumber: form.plateNumber,
        vehicleType: form.vehicleType,
        provinceCode: form.provinceCode,
        provinceName: form.provinceName,
        municipalityCode: form.municipalityCode,
        municipalityName: form.municipalityName,
        barangayCode: form.barangayCode,
        barangayName: form.barangayName,
        streetPurok: form.streetPurok,
        postalCode: form.postalCode,
        streetPlaceId: form.streetPlaceId,
        addressLatitude: form.addressLatitude,
        addressLongitude: form.addressLongitude,
        fullName: formatPersonName(form),
      };
      const driver = await api.registerDriver(registration);
      onCreated(driver, createDriverReceipt(driver, registration));
    } catch (requestError) {
      const message = requestError instanceof Error ? requestError.message : "Unable to register the driver.";
      setFormError(message);
      onError(message);
    } finally {
      setSaving(false);
    }
  }

  return createPortal(
    <div
      className="driver-registration-backdrop"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !saving) onCancel();
      }}
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
              <span className="eyebrow">DRIVER REGISTRY</span>
              <h2 id={titleId}>Register approved driver</h2>
              <p>Create the driver, franchise, vehicle, and secure QR record.</p>
            </div>
            <button type="button" onClick={onCancel} disabled={saving} aria-label="Close registration form">
              <X aria-hidden="true" />
            </button>
          </header>

          <div className="driver-registration-scroll">
            {formError && <div className="error driver-registration-error" role="alert">{formError}</div>}

            <FormSection number="01" title="Driver identity" description="Official identity and private account credentials.">
              <div className="form-grid driver-registration-grid">
                <div className="driver-name-fields">
                  <Field label="Last name" value={form.lastName} onChange={(value) => updateField("lastName", cleanPersonNamePart(value))} placeholder="Cajes" autoComplete="family-name" maxLength={45} autoFocus required />
                  <Field label="First name" value={form.firstName} onChange={(value) => updateField("firstName", cleanPersonNamePart(value))} placeholder="John" autoComplete="given-name" maxLength={45} required />
                  <MiddleInitialField value={form.middleInitial} onChange={(value) => updateField("middleInitial", value)} />
                </div>
                <PhoneField value={form.phone} onChange={(value) => updateField("phone", value)} />
                <Field label="Email address" value={form.email} onChange={(value) => updateField("email", value)} placeholder="driver@example.com" type="email" autoComplete="email" maxLength={160} hint="Used for secure account access." required />
                <label className="field">
                  <span>Temporary password <em>*</em></span>
                  <div className="driver-password-input">
                    <input type={showPassword ? "text" : "password"} value={form.temporaryPassword} onChange={(event) => updateField("temporaryPassword", event.target.value.slice(0, 72))} placeholder="Create a strong password" autoComplete="new-password" minLength={10} maxLength={72} required />
                    <button type="button" onClick={() => setShowPassword((visible) => !visible)} aria-label={showPassword ? "Hide password" : "Show password"}>{showPassword ? <EyeOff /> : <Eye />}</button>
                  </div>
                  <small>10+ characters with uppercase, lowercase, number, and symbol.</small>
                </label>
                <Field label="Driver license number" value={form.licenseNumber} onChange={(value) => updateField("licenseNumber", cleanRecordValue(value, 30))} placeholder="N01-98-123456" maxLength={30} hint="Use the number printed on the license." required />
                <Field label="License renewal date" value={form.renewalDate} onChange={(value) => updateField("renewalDate", value)} type="date" min={todayDate()} required />
                <label className="field">
                  <span>Account status <em>*</em></span>
                  <select value={form.accountStatus} onChange={(event) => updateField("accountStatus", event.target.value)} required>
                    <option value="ACTIVE">Active — driver can sign in</option>
                    <option value="INACTIVE">Inactive — sign-in is blocked</option>
                  </select>
                  <small>Controls account access only, not franchise eligibility.</small>
                </label>
              </div>
            </FormSection>

            <FormSection number="02" title="Driver address" description="A verified Bohol address linked to its official location hierarchy.">
              <DriverLocationFields value={form} onChange={updateLocation} />
            </FormSection>

            <FormSection number="03" title="Franchise record" description="Validated against the active LGU transport franchise.">
              <div className="form-grid driver-registration-grid">
                <Field label="Franchise number" value={form.franchiseNumber} onChange={(value) => updateField("franchiseNumber", cleanRecordValue(value, 40))} placeholder="TRI-2026-001" maxLength={40} required />
                <Field label="Issued date" value={form.franchiseIssuedAt} onChange={(value) => updateField("franchiseIssuedAt", value)} type="date" max={todayDate()} required />
                <Field label="Expiration date" value={form.franchiseExpiresAt} onChange={(value) => updateField("franchiseExpiresAt", value)} type="date" min={form.franchiseIssuedAt || todayDate()} required />
              </div>
            </FormSection>

            <FormSection number="04" title="Assigned vehicle" description="The QR identity is generated for this exact vehicle.">
              <div className="form-grid driver-registration-grid">
                <Field label="Plate number" value={form.plateNumber} onChange={(value) => updateField("plateNumber", cleanRecordValue(value, 15))} placeholder="NCA-1234" maxLength={15} required />
                <label className="field">
                  <span>Vehicle type <em>*</em></span>
                  <select value={form.vehicleType} onChange={(event) => updateField("vehicleType", event.target.value)} required>
                    <option value="TRICYCLE">Tricycle</option>
                    <option value="HABAL_HABAL">Habal-habal</option>
                  </select>
                </label>
              </div>
            </FormSection>
          </div>

          <footer className="driver-registration-actions">
            <p><ShieldCheck aria-hidden="true" /> Details are validated before any record is created.</p>
            <div>
              <button className="secondary" onClick={onCancel} disabled={saving} type="button">Cancel</button>
              <button className="primary" disabled={saving} type="submit">{saving ? "Registering…" : "Register driver"}</button>
            </div>
          </footer>
        </form>

        <aside className="driver-registration-help" aria-label="Registration process">
          <span className="driver-registration-help-icon"><ShieldCheck aria-hidden="true" /></span>
          <span className="eyebrow">SECURE APPROVAL</span>
          <h3>One verified transport identity</h3>
          <p>TriSafe creates all linked records in one database transaction. If any step fails, nothing partial is saved.</p>
          <div className="driver-registration-steps">
            <HelpStep icon={<CheckCircle2 />} title="Approved account" text="The driver is registered as verified." />
            <HelpStep icon={<CheckCircle2 />} title="Vehicle-linked QR" text="The QR belongs only to the assigned vehicle." />
            <HelpStep icon={<Info />} title="Issue credentials safely" text="Ask the driver to change the temporary password." />
          </div>
        </aside>
      </section>
    </div>,
    document.body,
  );
}

function FormSection({ number, title, description, children }: { number: string; title: string; description: string; children: ReactNode }) {
  return <section className="driver-form-section"><header><span>{number}</span><div><h3>{title}</h3><p>{description}</p></div></header>{children}</section>;
}

function HelpStep({ icon, title, text }: { icon: ReactNode; title: string; text: string }) {
  return <div className="driver-registration-step"><span>{icon}</span><div><strong>{title}</strong><small>{text}</small></div></div>;
}

function PhoneField({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  return <label className="field"><span>Mobile number <em>*</em></span><div className="driver-phone-input"><b>+63</b><input value={value} onChange={(event) => onChange(event.target.value.replace(/\D/g, "").slice(0, 10))} placeholder="9171234567" inputMode="numeric" autoComplete="tel-national" minLength={10} maxLength={10} required /></div><small>Enter 10 digits beginning with 9.</small></label>;
}

function MiddleInitialField({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  return <label className="field"><span>Middle initial</span><div className="middle-initial-input"><input value={value} onChange={(event) => onChange(cleanMiddleInitial(event.target.value))} placeholder="M" autoComplete="additional-name" maxLength={1} aria-label="Middle initial, one letter only" /><b aria-hidden="true">.</b></div><small>Optional · one letter only.</small></label>;
}

function Field({ label, value, onChange, placeholder, type = "text", required = false, hint, min, max, minLength, maxLength, autoComplete, autoFocus }: { label: string; value: string; onChange: (value: string) => void; placeholder?: string; type?: string; required?: boolean; hint?: string; min?: string; max?: string; minLength?: number; maxLength?: number; autoComplete?: string; autoFocus?: boolean }) {
  return <label className="field"><span>{label}{required && <em>*</em>}</span><input type={type} value={value} placeholder={placeholder} onChange={(event) => onChange(event.target.value)} required={required} min={min} max={max} minLength={minLength} maxLength={maxLength} autoComplete={autoComplete} autoFocus={autoFocus} />{hint && <small>{hint}</small>}</label>;
}
