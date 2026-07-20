import { useEffect, useState } from "react";
import {
  AdminUser,
  api,
  CreateUserInput,
  RoleDefinition,
  RoleInput,
  UpdateUserInput,
  UserPage,
  UserStatus,
} from "../../api";
import { DataToolbar, Pagination } from "../shared/DataControls";
import {
  EmptyState,
  ErrorMessage,
  LoadingState,
  SuccessMessage,
} from "../shared/Feedback";
import { RoleManager } from "./RoleManager";
import { UserForm } from "./UserForm";

const pageSize = 10;
const roleOptions = [
  { value: "", label: "All roles" },
  { value: "PASSENGER", label: "Passengers" },
  { value: "DRIVER", label: "Drivers" },
  { value: "LGU_ADMIN", label: "LGU administrators" },
];

export function UserDirectory() {
  const [view, setView] = useState<"users" | "roles">("users");
  const [search, setSearch] = useState("");
  const [role, setRole] = useState("");
  const [status, setStatus] = useState("");
  const [page, setPage] = useState(1);
  const [data, setData] = useState<UserPage>({
    items: [],
    total: 0,
    page: 1,
    pageSize,
  });
  const [roles, setRoles] = useState<RoleDefinition[]>([]);
  const [editingUser, setEditingUser] = useState<AdminUser | null>(null);
  const [creatingUser, setCreatingUser] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    api
      .roles()
      .then(setRoles)
      .catch((requestError: Error) => setError(requestError.message));
  }, [reloadKey]);

  useEffect(() => {
    const controller = new AbortController();
    const timer = window.setTimeout(
      () => {
        setLoading(true);
        setError("");
        api
          .users({ search, role, status, page, pageSize })
          .then((response) => {
            if (!controller.signal.aborted) setData(response);
          })
          .catch((requestError: Error) => {
            if (!controller.signal.aborted) setError(requestError.message);
          })
          .finally(() => {
            if (!controller.signal.aborted) setLoading(false);
          });
      },
      search ? 250 : 0,
    );
    return () => {
      controller.abort();
      window.clearTimeout(timer);
    };
  }, [search, role, status, page, reloadKey]);

  function reload(message?: string) {
    if (message) setNotice(message);
    setEditingUser(null);
    setCreatingUser(false);
    setReloadKey((value) => value + 1);
  }

  async function saveUser(input: CreateUserInput | UpdateUserInput) {
    if (editingUser) {
      await api.updateUser(editingUser.id, input as UpdateUserInput);
      reload(`${editingUser.fullName}'s account was updated.`);
    } else {
      const created = await api.createUser(input as CreateUserInput);
      reload(`${created.fullName}'s account was created.`);
    }
  }

  async function toggleStatus(user: AdminUser) {
    const next: UserStatus = user.status === "ACTIVE" ? "INACTIVE" : "ACTIVE";
    if (
      next === "INACTIVE" &&
      !window.confirm(
        `Deactivate ${user.fullName}? They will be signed out and unable to log in.`,
      )
    )
      return;
    try {
      await api.updateUser(user.id, { status: next });
      reload(`${user.fullName} is now ${next.toLowerCase()}.`);
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Unable to update account status.",
      );
    }
  }

  async function deleteUser(user: AdminUser) {
    if (
      !window.confirm(
        `Permanently delete ${user.fullName}? Accounts with linked operational records must be made inactive instead.`,
      )
    )
      return;
    try {
      await api.deleteUser(user.id);
      reload(`${user.fullName}'s account was deleted.`);
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Unable to delete the user.",
      );
    }
  }

  async function saveRole(roleId: string | null, input: RoleInput) {
    roleId ? await api.updateRole(roleId, input) : await api.createRole(input);
    reload(roleId ? "Role definition updated." : "Role definition created.");
  }

  async function deleteRole(roleDefinition: RoleDefinition) {
    if (!window.confirm(`Delete the ${roleDefinition.name} role definition?`))
      return;
    await api.deleteRole(roleDefinition.id);
    reload("Role definition deleted.");
  }

  if (creatingUser || editingUser) {
    return (
      <UserForm
        user={editingUser}
        roles={roles}
        onCancel={() => {
          setCreatingUser(false);
          setEditingUser(null);
        }}
        onSave={saveUser}
      />
    );
  }

  return (
    <section className="card data-card users-workspace">
      <div className="section-heading">
        <div>
          <span className="eyebrow">ACCESS CONTROL</span>
          <h3>Users &amp; roles</h3>
          <p className="section-description">
            Manage account access, role assignments, and the system roles used
            by TriSafe.
          </p>
        </div>
        {view === "users" && (
          <button
            className="primary"
            onClick={() => setCreatingUser(true)}
            type="button"
          >
            ＋ Create user
          </button>
        )}
      </div>
      <div
        className="workspace-tabs"
        role="tablist"
        aria-label="User management sections"
      >
        <button
          className={view === "users" ? "active" : ""}
          onClick={() => setView("users")}
          role="tab"
          aria-selected={view === "users"}
          type="button"
        >
          Users <span>{data.total}</span>
        </button>
        <button
          className={view === "roles" ? "active" : ""}
          onClick={() => setView("roles")}
          role="tab"
          aria-selected={view === "roles"}
          type="button"
        >
          Roles <span>{roles.length}</span>
        </button>
      </div>
      {notice && <SuccessMessage message={notice} />}
      {error && (
        <ErrorMessage
          message={error}
          onRetry={() => setReloadKey((value) => value + 1)}
        />
      )}
      {view === "roles" ? (
        <RoleManager roles={roles} onSave={saveRole} onDelete={deleteRole} />
      ) : (
        <>
          <DataToolbar
            search={search}
            onSearch={(value) => {
              setSearch(value);
              setPage(1);
            }}
            searchLabel="Search name, email, or phone"
            filter={role}
            onFilter={(value) => {
              setRole(value);
              setPage(1);
            }}
            filterLabel="Role"
            options={roleOptions}
            resultCount={data.total}
            additionalFilter={
              <label className="data-filter">
                <span>Status</span>
                <select
                  value={status}
                  onChange={(event) => {
                    setStatus(event.target.value);
                    setPage(1);
                  }}
                >
                  <option value="">All statuses</option>
                  <option value="ACTIVE">Active</option>
                  <option value="INACTIVE">Inactive</option>
                </select>
              </label>
            }
          />
          {loading ? (
            <LoadingState label="Loading user accounts…" />
          ) : data.items.length === 0 ? (
            <EmptyState
              title="No matching users"
              text="Try changing your search, role, or status filter."
            />
          ) : (
            <UserTable
              users={data.items}
              onEdit={setEditingUser}
              onToggleStatus={toggleStatus}
              onDelete={deleteUser}
            />
          )}
          {!loading && data.total > 0 && (
            <Pagination
              page={page}
              pageSize={pageSize}
              total={data.total}
              onPageChange={setPage}
            />
          )}
        </>
      )}
    </section>
  );
}

function UserTable({
  users,
  onEdit,
  onToggleStatus,
  onDelete,
}: {
  users: AdminUser[];
  onEdit: (user: AdminUser) => void;
  onToggleStatus: (user: AdminUser) => void;
  onDelete: (user: AdminUser) => void;
}) {
  return (
    <div className="responsive-table" role="table" aria-label="TriSafe users">
      <div className="data-row user-table-head data-head" role="row">
        <span>User</span>
        <span>Role</span>
        <span>Contact</span>
        <span>Account</span>
        <span>Driver status</span>
        <span>Actions</span>
      </div>
      {users.map((user) => (
        <div className="data-row user-row" role="row" key={user.id}>
          <div className="identity-cell">
            <span className="avatar">{initials(user.fullName)}</span>
            <span>
              <b>{user.fullName}</b>
              <small>
                Created {new Date(user.createdAt).toLocaleDateString("en-PH")}
              </small>
            </span>
          </div>
          <span>
            <span className={`role-badge role-${user.role.toLowerCase()}`}>
              {user.roleDefinition?.name ?? formatRole(user.role)}
            </span>
          </span>
          <span className="contact-cell">
            <b>{user.email ?? "No email"}</b>
            <small>{user.phone ?? "No phone number"}</small>
          </span>
          <span
            className={`status ${user.status.toLowerCase()}`}
            title={
              user.status === "ACTIVE"
                ? "This account can sign in."
                : "This account cannot sign in."
            }
          >
            {user.status}
          </span>
          <span>
            {user.driverProfile ? (
              <span
                className={`status ${user.driverProfile.verification.toLowerCase()}`}
                title={driverStatusHelp(user.driverProfile.verification)}
              >
                {user.driverProfile.verification}
              </span>
            ) : (
              <span className="muted">Not a driver</span>
            )}
          </span>
          <span className="row-menu">
            <button
              className="row-action"
              onClick={() => onEdit(user)}
              type="button"
            >
              Edit
            </button>
            <button
              className="row-action"
              onClick={() => void onToggleStatus(user)}
              type="button"
            >
              {user.status === "ACTIVE" ? "Deactivate" : "Activate"}
            </button>
            <button
              className="row-action danger-action"
              onClick={() => void onDelete(user)}
              type="button"
            >
              Delete
            </button>
          </span>
        </div>
      ))}
    </div>
  );
}

function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
}
function formatRole(role: AdminUser["role"]) {
  return role === "LGU_ADMIN"
    ? "LGU Administrator"
    : role.charAt(0) + role.slice(1).toLowerCase();
}
function driverStatusHelp(status: string) {
  return status === "VERIFIED"
    ? "Franchise is valid and the driver is eligible for QR verification."
    : status === "PENDING"
      ? "Waiting for LGU verification."
      : status === "SUSPENDED"
        ? "Manually suspended by the LGU."
        : "Franchise validity has ended.";
}
