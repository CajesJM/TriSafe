import {
  FormEvent,
  type ReactNode,
  useEffect,
  useId,
  useMemo,
  useState,
} from "react";
import { ShieldCheck, TriangleAlert, X } from "lucide-react";
import { createPortal } from "react-dom";
import type { AdminUser, Driver, UpdateUserInput, UserStatus } from "../../api";
import {
  parsePersonName,
  formatPersonName,
  cleanMiddleInitial,
} from "../../utils/personName";
import { DriverPhotoField } from "./DriverPhotoField";
import {
  DriverPresentAddressFields,
  type DriverPresentAddressValue,
} from "./DriverPresentAddressFields";
import {
  DriverRegistrationOverview,
  generatedDriverUsername,
  type DriverRegistrationDraft,
} from "./DriverRegistrationOverview";

type FormState = DriverPresentAddressValue & {
  ownerLastName: string;
  ownerFirstName: string;
  ownerMiddleName: string;
  driverLastName: string;
  driverFirstName: string;
  driverMiddleName: string;
  phone: string;
  accountStatus: UserStatus;
  avatarData: string | null;
  vehicleType: "TRICYCLE" | "HABAL_HABAL";
  bodyNumber: string;
  permitNumber: string;
  engineNumber: string;
  chassisNumber: string;
  plateNumber: string;
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
const phoneDigits = (value?: string | null) =>
  (value ?? "")
    .replace(/^\+63\s?/, "")
    .replace(/\D/g, "")
    .slice(0, 10);

export function DriverEditForm({
  driver,
  account,
  onCancel,
  onSave,
  onError,
}: {
  driver: Driver;
  account: AdminUser;
  onCancel: () => void;
  onSave: (input: UpdateUserInput) => Promise<void>;
  onError: (message: string) => void;
}) {
  const titleId = useId();
  const vehicle = driver.vehicles[0];
  const parsedName = useMemo(
    () => parsePersonName(driver.fullName),
    [driver.fullName],
  );
  const [form, setForm] = useState<FormState>(() => ({
    ownerLastName: driver.owner?.lastName ?? "",
    ownerFirstName: driver.owner?.firstName ?? "",
    ownerMiddleName: driver.owner?.middleName ?? "",
    driverLastName: parsedName.lastName,
    driverFirstName: parsedName.firstName,
    driverMiddleName: parsedName.middleInitial,
    phone: phoneDigits(driver.phone),
    accountStatus: driver.accountStatus ?? account.status,
    avatarData: driver.avatarData ?? account.avatarData ?? null,
    vehicleType:
      vehicle?.vehicleType === "HABAL_HABAL" ? "HABAL_HABAL" : "TRICYCLE",
    bodyNumber: vehicle?.bodyNumber ?? "",
    permitNumber: vehicle?.permitNumber ?? "",
    engineNumber: vehicle?.engineNumber ?? "",
    chassisNumber: vehicle?.chassisNumber ?? "",
    plateNumber: vehicle?.plateNumber ?? "",
    provinceCode: driver.address?.provinceCode ?? "0701200000",
    provinceName: driver.address?.provinceName ?? "Bohol",
    municipalityCode: driver.address?.municipalityCode ?? "",
    municipalityName: driver.address?.municipalityName ?? "",
    barangayCode: driver.address?.barangayCode ?? "",
    barangayName: driver.address?.barangayName ?? "",
    purok: driver.address?.purok ?? "",
  }));
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const originalUnit =
    vehicle?.vehicleType === "HABAL_HABAL"
      ? vehicle?.permitNumber
      : vehicle?.bodyNumber;
  const unit =
    form.vehicleType === "HABAL_HABAL" ? form.permitNumber : form.bodyNumber;
  const unitChanged = Boolean(unit && unit !== originalUnit);
  const username =
    account.username ??
    generatedDriverUsername(form.driverLastName, form.driverFirstName);
  const draft: DriverRegistrationDraft = {
    ...form,
    avatarData: form.avatarData ?? undefined,
    franchiseNumber: driver.franchise?.franchiseNumber ?? "",
    franchiseIssuedAt: driver.franchise?.issuedAt?.slice(0, 10) ?? "",
    franchiseExpiresAt: driver.franchise?.expiresAt?.slice(0, 10) ?? "",
  };

  useEffect(() => {
    const close = (event: KeyboardEvent) =>
      event.key === "Escape" && !saving && onCancel();
    document.addEventListener("keydown", close);
    return () => document.removeEventListener("keydown", close);
  }, [onCancel, saving]);
  const change = <K extends keyof FormState>(field: K, value: FormState[K]) => {
    setForm((current) => ({ ...current, [field]: value }));
    setError("");
  };
  const fail = (message: string) => {
    setError(message);
    onError(message);
  };
  function validate() {
    if (
      ![
        form.ownerLastName,
        form.ownerFirstName,
        form.driverLastName,
        form.driverFirstName,
      ].every((value) => namePattern.test(value.trim()))
    )
      return "Complete the owner and driver names using letters only.";
    if (!/^9\d{9}$/.test(form.phone))
      return "Driver contact number must contain 10 digits beginning with 9 after +63.";
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
    return "";
  }
  async function submit(event: FormEvent) {
    event.preventDefault();
    const message = validate();
    if (message) return fail(message);
    setSaving(true);
    try {
      await onSave({
        fullName: formatPersonName({
          lastName: form.driverLastName.trim(),
          firstName: form.driverFirstName.trim(),
          middleInitial: form.driverMiddleName,
        }),
        phone: `+63${form.phone}`,
        status: form.accountStatus,
        avatarData: form.avatarData,
        driverRecord: {
          ownerLastName: form.ownerLastName.trim(),
          ownerFirstName: form.ownerFirstName.trim(),
          ownerMiddleName: form.ownerMiddleName.trim() || undefined,
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
        },
      });
    } catch (requestError) {
      fail(
        requestError instanceof Error
          ? requestError.message
          : "Unable to update the driver account.",
      );
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
        className="driver-registration-modal driver-edit-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
      >
        <form className="driver-registration-form" onSubmit={submit} noValidate>
          <header className="driver-registration-header">
            <div>
              <span className="eyebrow">DRIVER &amp; VEHICLE REGISTRY</span>
              <h2 id={titleId}>Edit driver account</h2>
              <p>
                Update the private driver account and official transport record.
                Franchise controls remain in their own workspace.
              </p>
            </div>
            <button
              type="button"
              onClick={onCancel}
              disabled={saving}
              aria-label="Close driver editor"
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
            <EditSection
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
                  value={form.ownerMiddleName}
                  onChange={(value) =>
                    change("ownerMiddleName", cleanName(value))
                  }
                  required={false}
                />
              </div>
            </EditSection>
            <EditSection
              number="02"
              title="Driver account"
              description="The login username is preserved so the driver can continue signing in."
            >
              <DriverPhotoField
                value={form.avatarData ?? undefined}
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
                <label className="field">
                  <span>Driver middle initial</span>
                  <div className="middle-initial-input">
                    <input
                      value={form.driverMiddleName}
                      onChange={(event) =>
                        change(
                          "driverMiddleName",
                          cleanMiddleInitial(event.target.value),
                        )
                      }
                      maxLength={1}
                    />
                    <b>.</b>
                  </div>
                </label>
              </div>
              <div className="form-grid driver-registration-grid">
                <PhoneField
                  value={form.phone}
                  onChange={(value) => change("phone", value)}
                />
                <label className="field driver-auto-field">
                  <span>
                    Username <small>Read-only</small>
                  </span>
                  <input value={username} readOnly aria-readonly="true" />
                  <small>
                    The current driver login is not changed when the name is
                    edited.
                  </small>
                </label>
                <label className="field">
                  <span>
                    Account status <em>*</em>
                  </span>
                  <select
                    value={form.accountStatus}
                    onChange={(event) =>
                      change("accountStatus", event.target.value as UserStatus)
                    }
                  >
                    <option value="ACTIVE">Active — can sign in</option>
                    <option value="INACTIVE">Inactive — sign-in blocked</option>
                  </select>
                </label>
              </div>
            </EditSection>
            <EditSection
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
            </EditSection>
            <EditSection
              number="04"
              title="Motorcycle information"
              description="The Body or Permit Number is the driver’s initial password only when it changes."
            >
              <div className="form-grid driver-registration-grid">
                <label className="field">
                  <span>
                    Vehicle type <em>*</em>
                  </span>
                  <select
                    value={form.vehicleType}
                    onChange={(event) => {
                      const vehicleType = event.target
                        .value as FormState["vehicleType"];
                      setForm((current) => ({
                        ...current,
                        vehicleType,
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
                  value={unit}
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
              {unitChanged && (
                <div className="driver-edit-password-warning">
                  <TriangleAlert />
                  <div>
                    <strong>Password will be reset</strong>
                    <span>
                      Saving a new Body or Permit Number changes the driver’s
                      password to <b>{unit}</b>. Share it securely with the
                      driver.
                    </span>
                  </div>
                </div>
              )}
            </EditSection>
          </div>
          <footer className="driver-registration-actions">
            <p>
              <ShieldCheck /> Changes are validated against the live LGU
              registry.
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
                {saving ? "Saving…" : "Save driver changes"}
              </button>
            </div>
          </footer>
        </form>
        <DriverRegistrationOverview draft={draft} />
      </section>
    </div>,
    document.body,
  );
}
function EditSection({
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
