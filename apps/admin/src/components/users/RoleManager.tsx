import { useState } from "react";
import { RoleDefinition, RoleInput, UserRole } from "../../api";
import { EmptyState } from "../shared/Feedback";
import { RoleForm } from "./RoleForm";

export function RoleManager({
  roles,
  onSave,
  onDelete,
}: {
  roles: RoleDefinition[];
  onSave: (id: string | null, input: RoleInput) => Promise<void>;
  onDelete: (role: RoleDefinition) => Promise<void>;
}) {
  const [editing, setEditing] = useState<RoleDefinition | null>(null);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState("");
  const missingKeys = (
    ["PASSENGER", "DRIVER", "LGU_ADMIN"] as UserRole[]
  ).filter((key) => !roles.some((role) => role.key === key));

  if (editing || creating)
    return (
      <RoleForm
        role={editing}
        availableKeys={missingKeys}
        onCancel={() => {
          setEditing(null);
          setCreating(false);
        }}
        onSave={async (input) => {
          await onSave(editing?.id ?? null, input);
          setEditing(null);
          setCreating(false);
        }}
      />
    );
  return (
    <div className="role-workspace">
      <div className="role-toolbar">
        <div>
          <h4>System role definitions</h4>
          <p>
            Role keys are fixed because mobile and API authorization depend on
            them. Names, descriptions, permissions, and availability are
            configurable.
          </p>
        </div>
        <button
          className="secondary"
          disabled={missingKeys.length === 0}
          onClick={() => setCreating(true)}
          title={
            missingKeys.length
              ? "Restore a missing system role"
              : "All system roles already exist"
          }
          type="button"
        >
          ＋ Create role
        </button>
      </div>
      {error && (
        <div className="error" role="alert">
          {error}
        </div>
      )}
      {roles.length === 0 ? (
        <EmptyState text="Create the required TriSafe system role definitions." />
      ) : (
        <div className="role-grid">
          {roles.map((role) => (
            <article className="role-card" key={role.id}>
              <div className="role-card-heading">
                <span className={`role-icon role-${role.key.toLowerCase()}`}>
                  {role.key === "LGU_ADMIN" ? "A" : role.key[0]}
                </span>
                <div>
                  <h4>{role.name}</h4>
                  <code>{role.key}</code>
                </div>
                <span
                  className={`status ${role.active ? "active" : "inactive"}`}
                >
                  {role.active ? "ACTIVE" : "INACTIVE"}
                </span>
              </div>
              <p>{role.description || "No description provided."}</p>
              <div className="permission-list">
                {role.permissions.map((permission) => (
                  <span key={permission}>{permission}</span>
                ))}
                {role.permissions.length === 0 && (
                  <em>No permissions listed</em>
                )}
              </div>
              <div className="role-card-footer">
                <span>
                  {role._count.users} assigned{" "}
                  {role._count.users === 1 ? "user" : "users"}
                </span>
                <div>
                  <button
                    className="row-action"
                    onClick={() => setEditing(role)}
                    type="button"
                  >
                    Edit
                  </button>
                  <button
                    className="row-action danger-action"
                    onClick={async () => {
                      try {
                        await onDelete(role);
                      } catch (requestError) {
                        setError(
                          requestError instanceof Error
                            ? requestError.message
                            : "Unable to delete role.",
                        );
                      }
                    }}
                    type="button"
                  >
                    Delete
                  </button>
                </div>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
