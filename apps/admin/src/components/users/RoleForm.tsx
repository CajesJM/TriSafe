import { FormEvent, useState } from "react";
import { RoleDefinition, RoleInput, UserRole } from "../../api";

export function RoleForm({
  role,
  availableKeys,
  onCancel,
  onSave,
}: {
  role: RoleDefinition | null;
  availableKeys: UserRole[];
  onCancel: () => void;
  onSave: (input: RoleInput) => Promise<void>;
}) {
  const [key, setKey] = useState<UserRole>(
    role?.key ?? availableKeys[0] ?? "PASSENGER",
  );
  const [name, setName] = useState(role?.name ?? "");
  const [description, setDescription] = useState(role?.description ?? "");
  const [permissions, setPermissions] = useState(
    role?.permissions.join(", ") ?? "",
  );
  const [active, setActive] = useState(role?.active ?? true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  async function submit(event: FormEvent) {
    event.preventDefault();
    setSaving(true);
    setError("");
    try {
      await onSave({
        key,
        name,
        description,
        permissions: permissions
          .split(",")
          .map((item) => item.trim())
          .filter(Boolean),
        active,
      });
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Unable to save role.",
      );
    } finally {
      setSaving(false);
    }
  }
  return (
    <form className="role-form" onSubmit={submit}>
      <div className="form-heading">
        <div>
          <span className="eyebrow">ROLE DEFINITION</span>
          <h3>{role ? `Edit ${role.name}` : "Create role definition"}</h3>
          <p>
            System keys remain fixed so API and mobile authorization stay
            predictable.
          </p>
        </div>
        <button className="close-button" onClick={onCancel} type="button">
          ×
        </button>
      </div>
      {error && <div className="error form-error">{error}</div>}
      <div className="form-grid form-section">
        <label className="field">
          <span>System key</span>
          <select
            disabled={Boolean(role)}
            value={key}
            onChange={(event) => setKey(event.target.value as UserRole)}
          >
            {(role ? [role.key] : availableKeys).map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
        </label>
        <label className="field">
          <span>Display name</span>
          <input
            value={name}
            onChange={(event) => setName(event.target.value)}
            required
          />
        </label>
        <label className="field field-wide">
          <span>Description</span>
          <textarea
            value={description}
            onChange={(event) => setDescription(event.target.value)}
          />
        </label>
        <label className="field field-wide">
          <span>Permission labels (comma-separated)</span>
          <textarea
            value={permissions}
            onChange={(event) => setPermissions(event.target.value)}
            placeholder="admin:all, users:manage"
          />
        </label>
        <label className="checkbox-field">
          <input
            type="checkbox"
            checked={active}
            onChange={(event) => setActive(event.target.checked)}
          />
          <span>Role is available for authorization</span>
        </label>
      </div>
      <div className="form-actions">
        <button className="secondary" onClick={onCancel} type="button">
          Cancel
        </button>
        <button className="primary" disabled={saving} type="submit">
          {saving ? "Saving…" : "Save role"}
        </button>
      </div>
    </form>
  );
}
