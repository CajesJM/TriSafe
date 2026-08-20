import { FormEvent, useEffect, useId, useState } from "react";
import { createPortal } from "react-dom";
import {
  AdminUser,
  Driver,
  CreateUserInput,
  RoleDefinition,
  UpdateUserInput,
  UserRole,
  UserStatus,
} from "../../api";
import { DriverPresentAddressFields } from "../drivers/DriverPresentAddressFields";
import {
  cleanPersonNamePart,
  cleanMiddleInitial,
  displayPersonName,
  formatPersonName,
  parsePersonName,
  validatePersonName,
} from "../../utils/personName";

type EditableAdminUser = AdminUser & {
  username?: string | null;
};

type Props = {
  user: EditableAdminUser | null;
  roles: RoleDefinition[];
  onCancel: () => void;
  onSave: (input: CreateUserInput | UpdateUserInput) => Promise<void>;
  onError: (message: string) => void;
  defaultRole?: UserRole;
  fixedRole?: "PASSENGER" | "LGU_ADMIN";
  driver?: Driver;
};

export function UserForm({
  user,
  roles,
  onCancel,
  onSave,
  onError,
  defaultRole = "PASSENGER",
  fixedRole,
  driver,
}: Props) {
  const titleId = useId();
  const [role, setRole] = useState<UserRole>(fixedRole ?? user?.role ?? defaultRole);
  const isDriver = role === "DRIVER";
  const isPassenger = role === "PASSENGER";
  const usesStructuredName = isDriver || isPassenger;
  const [fullName, setFullName] = useState(user?.fullName ?? "");
  const [personName, setPersonName] = useState(() =>
    parsePersonName(user?.fullName ?? ""),
  );
  const [username, setUsername] = useState(user?.username ?? "");
  const [email, setEmail] = useState(user?.email ?? "");
  const [phone, setPhone] = useState(() => localPhoneDigits(user?.phone));
  const [status, setStatus] = useState<UserStatus>(user?.status ?? "ACTIVE");
  const [password, setPassword] = useState("");
  const [address, setAddress] = useState(() => ({
    provinceCode: driver?.address?.provinceCode ?? "0701200000",
    provinceName: driver?.address?.provinceName ?? "Bohol",
    municipalityCode: driver?.address?.municipalityCode ?? "",
    municipalityName: driver?.address?.municipalityName ?? "",
    barangayCode: driver?.address?.barangayCode ?? "",
    barangayName: driver?.address?.barangayName ?? "",
    purok: driver?.address?.purok ?? "",
  }));
  const vehicle = driver?.vehicles[0];
  const [owner, setOwner] = useState({
    lastName: driver?.owner?.lastName ?? "",
    firstName: driver?.owner?.firstName ?? "",
    middleName: driver?.owner?.middleName ?? "",
  });
  const [vehicleRecord, setVehicleRecord] = useState({
    vehicleType: (vehicle?.vehicleType === "HABAL_HABAL"
      ? "HABAL_HABAL"
      : "TRICYCLE") as "TRICYCLE" | "HABAL_HABAL",
    bodyNumber: vehicle?.bodyNumber ?? "",
    permitNumber: vehicle?.permitNumber ?? "",
    engineNumber: vehicle?.engineNumber ?? "",
    chassisNumber: vehicle?.chassisNumber ?? "",
    plateNumber: vehicle?.plateNumber ?? "",
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const assignableRoles = roles.filter((item) =>
    item.active && (fixedRole ? item.key === fixedRole : item.key !== "DRIVER" || user?.role === "DRIVER"),
  );

  useEffect(() => {
    function handleKey(event: KeyboardEvent) {
      if (event.key === "Escape" && !saving) onCancel();
    }
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [onCancel, saving]);

  async function submit(event: FormEvent) {
    event.preventDefault();
    const nameError = usesStructuredName ? validatePersonName(personName) : "";
    if (nameError) {
      setError(nameError);
      onError(nameError);
      return;
    }
    const submittedName = usesStructuredName
      ? formatPersonName(personName)
      : fullName.trim();
    if (!submittedName) {
      const message = "Full name is required.";
      setError(message);
      onError(message);
      return;
    }
    const normalizedUsername = username.trim().toLowerCase();
    if (
      isPassenger &&
      !/^(?=.{3,30}$)[a-z][a-z0-9]*(?:[._-][a-z0-9]+)*$/.test(
        normalizedUsername,
      )
    ) {
      const message =
        "Username must be 3–30 characters, begin with a letter, and use only lowercase letters, numbers, dots, underscores, or hyphens.";
      setError(message);
      onError(message);
      return;
    }
    if (isDriver && (!address.municipalityCode || !address.municipalityName)) {
      const message = "Select the driver's municipality or city.";
      setError(message);
      onError(message);
      return;
    }
    if (isDriver && (!address.barangayCode || !address.barangayName)) {
      const message = "Select the driver's barangay.";
      setError(message);
      onError(message);
      return;
    }
    if (isDriver && !address.purok.trim()) {
      const message = "Enter the driver's present Purok.";
      setError(message);
      onError(message);
      return;
    }
    if (
      isDriver &&
      (!owner.lastName.trim() ||
        !owner.firstName.trim() ||
        !vehicleRecord.engineNumber ||
        !vehicleRecord.chassisNumber ||
        !vehicleRecord.plateNumber ||
        !(vehicleRecord.vehicleType === "TRICYCLE"
          ? vehicleRecord.bodyNumber
          : vehicleRecord.permitNumber))
    ) {
      const message =
        "Complete the owner, unit number, engine, chassis, and plate details.";
      setError(message);
      onError(message);
      return;
    }
    setSaving(true);
    setError("");
    try {
      if (user)
        await onSave({
          fullName: submittedName,
          ...(isPassenger ? { username: normalizedUsername } : {}),
          ...(!isDriver ? { email } : {}),
          phone: `+63${phone}`,
          role: fixedRole ?? role,
          status,
          ...(password ? { newPassword: password } : {}),
          ...(isDriver
            ? {
                driverRecord: {
                  ownerLastName: owner.lastName.trim(),
                  ownerFirstName: owner.firstName.trim(),
                  ownerMiddleName: owner.middleName.trim() || undefined,
                  vehicleType: vehicleRecord.vehicleType,
                  bodyNumber:
                    vehicleRecord.vehicleType === "TRICYCLE"
                      ? vehicleRecord.bodyNumber
                      : undefined,
                  permitNumber:
                    vehicleRecord.vehicleType === "HABAL_HABAL"
                      ? vehicleRecord.permitNumber
                      : undefined,
                  engineNumber: vehicleRecord.engineNumber,
                  chassisNumber: vehicleRecord.chassisNumber,
                  plateNumber: vehicleRecord.plateNumber,
                  address,
                },
              }
            : {}),
        });
      else
        await onSave({
          fullName: submittedName,
          ...(isPassenger ? { username: normalizedUsername } : {}),
          email,
          phone: `+63${phone}`,
          role: fixedRole ?? role,
          status,
          temporaryPassword: password,
        });
    } catch (requestError) {
      const message =
        requestError instanceof Error
          ? requestError.message
          : "Unable to save the account.";
      setError(message);
      onError(message);
    } finally {
      setSaving(false);
    }
  }

  return createPortal(
    <div
      className="user-form-modal-backdrop"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !saving) onCancel();
      }}
    >
      <section
        className="registration-layout user-form-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
      >
        <form className="card registration-form" onSubmit={submit}>
          <div className="form-heading">
            <div>
              <span className="eyebrow">USER ACCOUNT</span>
              <h3 id={titleId}>
                {user
                  ? `Edit ${usesStructuredName ? displayPersonName(user.fullName) : user.fullName}`
                  : "Create a user"}
              </h3>
              <p>
                Account status controls sign-in access immediately. Passwords
                must contain at least eight characters.
              </p>
            </div>
            <button
              className="close-button"
              onClick={onCancel}
              type="button"
              disabled={saving}
              aria-label="Close user form"
            >
              ×
            </button>
          </div>
          {error && (
            <div className="error form-error" role="alert">
              {error}
            </div>
          )}
          {user?.role === "DRIVER" && (
            <div className="driver-account-boundary" role="note">
              <strong>Editing account access only</strong>
              <span>
                License, franchise, vehicle, eligibility, and QR information are
                managed from Drivers &amp; QR through “View driver profile.”
              </span>
            </div>
          )}
          <div className="form-section">
            <h4>Identity and contact</h4>
            <div className="form-grid">
              {usesStructuredName ? (
                <div className="driver-name-fields user-driver-name-fields">
                  <label className="field">
                    <span>
                      Last name <em>*</em>
                    </span>
                    <input
                      autoFocus
                      value={personName.lastName}
                      onChange={(event) =>
                        setPersonName((current) => ({
                          ...current,
                          lastName: cleanPersonNamePart(event.target.value),
                        }))
                      }
                      placeholder="Cajes"
                      autoComplete="family-name"
                      maxLength={45}
                      required
                    />
                  </label>
                  <label className="field">
                    <span>
                      First name <em>*</em>
                    </span>
                    <input
                      value={personName.firstName}
                      onChange={(event) =>
                        setPersonName((current) => ({
                          ...current,
                          firstName: cleanPersonNamePart(event.target.value),
                        }))
                      }
                      placeholder="John"
                      autoComplete="given-name"
                      maxLength={45}
                      required
                    />
                  </label>
                  <label className="field">
                    <span>Middle initial</span>
                    <div className="middle-initial-input">
                      <input
                        value={personName.middleInitial}
                        onChange={(event) =>
                          setPersonName((current) => ({
                            ...current,
                            middleInitial: cleanMiddleInitial(
                              event.target.value,
                            ),
                          }))
                        }
                        placeholder="M"
                        autoComplete="additional-name"
                        maxLength={1}
                        aria-label="Middle initial, one letter only"
                      />
                      <b aria-hidden="true">.</b>
                    </div>
                    <small className="field-input-hint">
                      Optional · one letter only.
                    </small>
                  </label>
                </div>
              ) : (
                <label className="field">
                  <span>
                    Full name <em>*</em>
                  </span>
                  <input
                    autoFocus
                    value={fullName}
                    onChange={(event) => setFullName(event.target.value)}
                    required
                  />
                </label>
              )}
              {isPassenger && (
                <label className="field">
                  <span>
                    Username <em>*</em>
                  </span>
                  <input
                    value={username}
                    onChange={(event) =>
                      setUsername(
                        event.target.value
                          .toLowerCase()
                          .replace(/[^a-z0-9._-]/g, "")
                          .slice(0, 30),
                      )
                    }
                    placeholder="john.cajes"
                    autoComplete="username"
                    minLength={3}
                    maxLength={30}
                    required
                  />
                  <small className="field-input-hint">
                    3–30 characters · start with a letter · no repeated
                    separators.
                  </small>
                </label>
              )}
              {!isDriver && (
                <label className="field">
                  <span>
                    Email address <em>*</em>
                  </span>
                  <input
                    type="email"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    required
                  />
                </label>
              )}
              <label className="field">
                <span>
                  Philippine phone number <em>*</em>
                </span>
                <div className="phone-input user-phone-input">
                  <span aria-hidden="true">+63&nbsp;</span>
                  <input
                    aria-label="10-digit Philippine mobile number after plus 63"
                    value={phone}
                    onChange={(event) =>
                      setPhone(
                        event.target.value.replace(/\D/g, "").slice(0, 10),
                      )
                    }
                    placeholder="9171234567"
                    inputMode="numeric"
                    autoComplete="tel-national"
                    minLength={10}
                    maxLength={10}
                    pattern="[0-9]{10}"
                    title="Enter exactly 10 digits after +63"
                    required
                  />
                </div>
                <small className="field-input-hint">
                  Enter exactly 10 digits after +63.
                </small>
              </label>
              <label className="field">
                <span>
                  {user ? "New password" : "Temporary password"}{" "}
                  {!user && <em>*</em>}
                </span>
                <input
                  type="password"
                  minLength={8}
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  required={!user}
                  autoComplete="new-password"
                  placeholder={
                    user
                      ? "Leave blank to keep current password"
                      : "At least 8 characters"
                  }
                />
              </label>
            </div>
          </div>
          {isDriver && user && (
            <div className="form-section driver-account-address-section">
              <h4>Owner, vehicle, and present address</h4>
              <p className="driver-account-address-description">
                These are the official LGU registration fields shown during QR
                verification.
              </p>
              <div className="form-grid">
                <label className="field">
                  <span>
                    Owner last name <em>*</em>
                  </span>
                  <input
                    value={owner.lastName}
                    onChange={(e) =>
                      setOwner({ ...owner, lastName: e.target.value })
                    }
                    required
                  />
                </label>
                <label className="field">
                  <span>
                    Owner first name <em>*</em>
                  </span>
                  <input
                    value={owner.firstName}
                    onChange={(e) =>
                      setOwner({ ...owner, firstName: e.target.value })
                    }
                    required
                  />
                </label>
                <label className="field">
                  <span>Owner middle name</span>
                  <input
                    value={owner.middleName}
                    onChange={(e) =>
                      setOwner({ ...owner, middleName: e.target.value })
                    }
                  />
                </label>
                <label className="field">
                  <span>
                    Vehicle type <em>*</em>
                  </span>
                  <select
                    value={vehicleRecord.vehicleType}
                    onChange={(e) =>
                      setVehicleRecord({
                        ...vehicleRecord,
                        vehicleType: e.target.value as
                          | "TRICYCLE"
                          | "HABAL_HABAL",
                        bodyNumber: "",
                        permitNumber: "",
                      })
                    }
                  >
                    <option value="TRICYCLE">Tricycle</option>
                    <option value="HABAL_HABAL">Habal-habal</option>
                  </select>
                </label>
                <label className="field">
                  <span>
                    {vehicleRecord.vehicleType === "TRICYCLE"
                      ? "Body number"
                      : "Permit number"}{" "}
                    <em>*</em>
                  </span>
                  <input
                    value={
                      vehicleRecord.vehicleType === "TRICYCLE"
                        ? vehicleRecord.bodyNumber
                        : vehicleRecord.permitNumber
                    }
                    onChange={(e) =>
                      setVehicleRecord({
                        ...vehicleRecord,
                        [vehicleRecord.vehicleType === "TRICYCLE"
                          ? "bodyNumber"
                          : "permitNumber"]: e.target.value
                          .toUpperCase()
                          .replace(/[^A-Z0-9-]/g, ""),
                      })
                    }
                    required
                  />
                </label>
                <label className="field">
                  <span>
                    Engine number <em>*</em>
                  </span>
                  <input
                    value={vehicleRecord.engineNumber}
                    onChange={(e) =>
                      setVehicleRecord({
                        ...vehicleRecord,
                        engineNumber: e.target.value
                          .toUpperCase()
                          .replace(/[^A-Z0-9-]/g, ""),
                      })
                    }
                    required
                  />
                </label>
                <label className="field">
                  <span>
                    Chassis number <em>*</em>
                  </span>
                  <input
                    value={vehicleRecord.chassisNumber}
                    onChange={(e) =>
                      setVehicleRecord({
                        ...vehicleRecord,
                        chassisNumber: e.target.value
                          .toUpperCase()
                          .replace(/[^A-Z0-9-]/g, ""),
                      })
                    }
                    required
                  />
                </label>
                <label className="field">
                  <span>
                    Plate number <em>*</em>
                  </span>
                  <input
                    value={vehicleRecord.plateNumber}
                    onChange={(e) =>
                      setVehicleRecord({
                        ...vehicleRecord,
                        plateNumber: e.target.value
                          .toUpperCase()
                          .replace(/[^A-Z0-9-]/g, ""),
                      })
                    }
                    required
                  />
                </label>
              </div>
              <DriverPresentAddressFields
                value={address}
                onChange={(changes) => {
                  setAddress((current) => ({ ...current, ...changes }));
                  setError("");
                }}
              />
            </div>
          )}
          <div className="form-section">
            <h4>Authorization</h4>
            <div className="form-grid">
              <label className="field">
                <span>
                  System role <em>*</em>
                </span>
                <select
                  value={role}
                  disabled={Boolean(fixedRole) || user?.role === "DRIVER"}
                  onChange={(event) => setRole(event.target.value as UserRole)}
                >
                  {assignableRoles.map((item) => (
                    <option key={item.key} value={item.key}>
                      {item.key === "LGU_ADMIN" ? "Administrator" : item.name}
                    </option>
                  ))}
                </select>
              </label>
              <label className="field">
                <span>
                  Account status <em>*</em>
                </span>
                <select
                  value={status}
                  onChange={(event) =>
                    setStatus(event.target.value as UserStatus)
                  }
                >
                  <option value="ACTIVE">Active — can sign in</option>
                  <option value="INACTIVE">Inactive — sign-in blocked</option>
                </select>
              </label>
            </div>
          </div>
          <div className="form-actions">
            <button className="secondary" onClick={onCancel} type="button">
              Cancel
            </button>
            <button
              className="primary submit-button"
              disabled={saving}
              type="submit"
            >
              {saving ? "Saving…" : user ? "Save changes" : "Create account"}
            </button>
          </div>
        </form>
        <aside className="card form-help">
          <div className="help-icon">i</div>
          <h3>Access safeguards</h3>
          <p>
            TriSafe prevents administrators from deactivating themselves or
            removing the final active Administrator.
          </p>
          <div className="help-step">
            <b>1</b>Choose the minimum role needed
          </div>
          <div className="help-step">
            <b>2</b>Share temporary credentials securely
          </div>
          <div className="help-step">
            <b>3</b>Deactivate access when no longer needed
          </div>
        </aside>
      </section>
    </div>,
    document.body,
  );
}

function localPhoneDigits(value: string | null | undefined) {
  const digits = (value ?? "").replace(/\D/g, "");
  if (digits.startsWith("63")) return digits.slice(2, 12);
  if (digits.startsWith("0")) return digits.slice(1, 11);
  return digits.slice(0, 10);
}
