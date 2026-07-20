import { FormEvent, useState } from "react";
import {
  AdminUser,
  CreateUserInput,
  RoleDefinition,
  UpdateUserInput,
  UserRole,
  UserStatus,
} from "../../api";

type Props = {
  user: AdminUser | null;
  roles: RoleDefinition[];
  onCancel: () => void;
  onSave: (input: CreateUserInput | UpdateUserInput) => Promise<void>;
};

export function UserForm({ user, roles, onCancel, onSave }: Props) {
  const [fullName, setFullName] = useState(user?.fullName ?? "");
  const [email, setEmail] = useState(user?.email ?? "");
  const [phone, setPhone] = useState(user?.phone ?? "");
  const [role, setRole] = useState<UserRole>(user?.role ?? "PASSENGER");
  const [status, setStatus] = useState<UserStatus>(user?.status ?? "ACTIVE");
  const [password, setPassword] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const assignableRoles = roles.filter(
    (item) => item.active && (item.key !== "DRIVER" || user?.role === "DRIVER"),
  );

  async function submit(event: FormEvent) {
    event.preventDefault();
    setSaving(true);
    setError("");
    try {
      if (user)
        await onSave({
          fullName,
          email,
          phone,
          role,
          status,
          ...(password ? { newPassword: password } : {}),
        });
      else
        await onSave({
          fullName,
          email,
          phone: phone || undefined,
          role,
          status,
          temporaryPassword: password,
        });
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Unable to save the account.",
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="registration-layout">
      <form className="card registration-form" onSubmit={submit}>
        <div className="form-heading">
          <div>
            <span className="eyebrow">USER ACCOUNT</span>
            <h3>{user ? `Edit ${user.fullName}` : "Create a user"}</h3>
            <p>
              Account status controls sign-in access immediately. Passwords must
              contain at least eight characters.
            </p>
          </div>
          <button
            className="close-button"
            onClick={onCancel}
            type="button"
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
        <div className="form-section">
          <h4>Identity and contact</h4>
          <div className="form-grid">
            <label className="field">
              <span>
                Full name <em>*</em>
              </span>
              <input
                value={fullName}
                onChange={(event) => setFullName(event.target.value)}
                required
              />
            </label>
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
            <label className="field">
              <span>Philippine phone number</span>
              <input
                value={phone}
                onChange={(event) => setPhone(event.target.value)}
                placeholder="+639171234567"
              />
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
        <div className="form-section">
          <h4>Authorization</h4>
          <div className="form-grid">
            <label className="field">
              <span>
                System role <em>*</em>
              </span>
              <select
                value={role}
                disabled={user?.role === "DRIVER"}
                onChange={(event) => setRole(event.target.value as UserRole)}
              >
                {assignableRoles.map((item) => (
                  <option key={item.key} value={item.key}>
                    {item.name}
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
          <p className="field-note">
            Driver accounts require franchise, vehicle, and QR records and must
            be created from Drivers &amp; QR.
          </p>
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
          removing the final active LGU administrator.
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
  );
}
