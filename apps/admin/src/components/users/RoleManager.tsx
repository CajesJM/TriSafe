import { useState } from "react";
import { RoleDefinition, RoleInput } from "../../api";
import { EmptyState } from "../shared/Feedback";
import { RoleForm } from "./RoleForm";

export function RoleManager({
  roles,
  onSave,
  onError,
}: {
  roles: RoleDefinition[];
  onSave: (id: string | null, input: RoleInput) => Promise<void>;
  onError: (message: string) => void;
}) {
  const [editing, setEditing] = useState<RoleDefinition | null>(null);

  if (editing)
    return (
      <RoleForm
        role={editing}
        availableKeys={[]}
        onCancel={() => setEditing(null)}
        onSave={async (input) => {
          await onSave(editing.id, input);
          setEditing(null);
        }}
        onError={onError}
      />
    );
  return (
    <div className="role-workspace">
      <div className="role-toolbar">
        <div>
          <h4>System role definitions</h4>
          <p>
            Role keys are fixed because mobile and API authorization depend on
            them. Display names are also system controlled; descriptions,
            permissions, and availability remain configurable.
          </p>
        </div>
      </div>
      {roles.length === 0 ? (
        <EmptyState text="No TriSafe system role definitions are available." />
      ) : (
        <div className="role-grid">
          {roles.map((role) => (
            <article className="role-card" key={role.id}>
              <div className="role-card-heading">
                <span className={`role-icon role-${role.key.toLowerCase()}`}>
                  {role.key === "LGU_ADMIN" ? "A" : role.key[0]}
                </span>
                <div>
                  <h4>{role.key === "LGU_ADMIN" ? "Administrator" : role.name}</h4>
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
                </div>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
