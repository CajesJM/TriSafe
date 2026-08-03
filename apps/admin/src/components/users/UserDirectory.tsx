import { useCallback, useEffect, useState } from "react";
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
import { EmptyState, ErrorMessage, LoadingState } from "../shared/Feedback";
import {
  ToastNotification,
  type ToastMessage,
} from "../shared/ToastNotification";
import { ConfirmModal } from "../shared/ConfirmModal";
import { RoleManager } from "./RoleManager";
import { UserForm } from "./UserForm";
import { displayPersonName } from "../../utils/personName";

const pageSize = 10;
type DirectoryUser = AdminUser & { username?: string | null };
const emptyUserPage: UserPage = { items: [], total: 0, page: 1, pageSize };
const accountPageCache = new Map<string, UserPage>();
let roleDefinitionCache: RoleDefinition[] | null = null;

function accountCacheKey(
  role: string,
  search: string,
  status: string,
  page: number,
) {
  return `${role}|${search.trim().toLowerCase()}|${status}|${page}`;
}
type Confirmation = {
  title: string;
  message: string;
  confirmLabel: string;
  tone: "danger" | "warning";
  action: () => Promise<void>;
};
export function UserDirectory() {
  const initialCacheKey = accountCacheKey("PASSENGER", "", "", 1);
  const initialCachedPage = accountPageCache.get(initialCacheKey);
  const [view, setView] = useState<"passengers" | "administrators" | "roles">(
    "passengers",
  );
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [page, setPage] = useState(1);
  const [data, setData] = useState<UserPage>(
    initialCachedPage ?? emptyUserPage,
  );
  const [roles, setRoles] = useState<RoleDefinition[]>(
    roleDefinitionCache ?? [],
  );
  const [editingUser, setEditingUser] = useState<AdminUser | null>(null);
  const [creatingUser, setCreatingUser] = useState(false);
  const [loading, setLoading] = useState(false);
  const [waitingForAccounts, setWaitingForAccounts] =
    useState(!initialCachedPage);
  const [error, setError] = useState("");
  const [toast, setToast] = useState<ToastMessage | null>(null);
  const [confirmation, setConfirmation] = useState<Confirmation | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  const showToast = useCallback(
    (type: ToastMessage["type"], message: string) => {
      setToast({ id: Date.now(), type, message });
    },
    [],
  );
  const dismissToast = useCallback(() => setToast(null), []);

  useEffect(() => {
    api
      .roles()
      .then((nextRoles) => {
        roleDefinitionCache = nextRoles;
        setRoles(nextRoles);
      })
      .catch((requestError: Error) => setError(requestError.message));
  }, [reloadKey]);

  useEffect(() => {
    if (view === "roles") return;
    const controller = new AbortController();
    const selectedRole = view === "administrators" ? "LGU_ADMIN" : "PASSENGER";
    const cacheKey = accountCacheKey(selectedRole, search, status, page);
    const cachedPage = accountPageCache.get(cacheKey);
    if (cachedPage) {
      setData(cachedPage);
      setWaitingForAccounts(false);
      setLoading(false);
    } else {
      setWaitingForAccounts(true);
      setLoading(false);
    }
    let skeletonTimer: number | undefined;
    let requestComplete = false;
    const timer = window.setTimeout(
      () => {
        skeletonTimer = window.setTimeout(() => {
          if (!controller.signal.aborted && !cachedPage && !requestComplete)
            setLoading(true);
        }, 350);
        setError("");
        api
          .users({ search, role: selectedRole, status, page, pageSize })
          .then((response) => {
            if (!controller.signal.aborted) {
              accountPageCache.set(cacheKey, response);
              setData(response);
            }
          })
          .catch((requestError: Error) => {
            if (!controller.signal.aborted) setError(requestError.message);
          })
          .finally(() => {
            requestComplete = true;
            if (skeletonTimer !== undefined) window.clearTimeout(skeletonTimer);
            if (!controller.signal.aborted) {
              setWaitingForAccounts(false);
              setLoading(false);
            }
          });
      },
      search ? 250 : 0,
    );
    return () => {
      controller.abort();
      window.clearTimeout(timer);
      if (skeletonTimer !== undefined) window.clearTimeout(skeletonTimer);
    };
  }, [search, status, page, reloadKey, view]);

  function changeView(nextView: "passengers" | "administrators" | "roles") {
    if (nextView === view) return;
    setView(nextView);
    setPage(1);
    setSearch("");
    setStatus("");
    if (nextView !== "roles") {
      const nextRole =
        nextView === "administrators" ? "LGU_ADMIN" : "PASSENGER";
      const cachedPage = accountPageCache.get(
        accountCacheKey(nextRole, "", "", 1),
      );
      setData(cachedPage ?? emptyUserPage);
      setWaitingForAccounts(!cachedPage);
      setLoading(false);
    }
  }

  function reload(message?: string) {
    if (message) showToast("success", message);
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

  async function applyUserStatus(user: AdminUser, next: UserStatus) {
    await api.updateUser(user.id, { status: next });
    reload(`${user.fullName} is now ${next.toLowerCase()}.`);
  }

  function toggleStatus(user: AdminUser) {
    const next: UserStatus = user.status === "ACTIVE" ? "INACTIVE" : "ACTIVE";
    if (next === "INACTIVE") {
      setConfirmation({
        title: `Deactivate ${user.fullName}?`,
        message:
          "This account will be signed out and prevented from logging in until an Administrator activates it again.",
        confirmLabel: "Deactivate account",
        tone: "warning",
        action: () => applyUserStatus(user, next),
      });
      return;
    }
    void applyUserStatus(user, next).catch((requestError: unknown) =>
      showToast(
        "error",
        requestError instanceof Error
          ? requestError.message
          : "Unable to update account status.",
      ),
    );
  }

  function deleteUser(user: AdminUser) {
    setConfirmation({
      title: `Permanently delete ${user.fullName}?`,
      message:
        "This cannot be undone. Accounts connected to rides, reports, or driver records cannot be deleted and should be deactivated instead.",
      confirmLabel: "Delete permanently",
      tone: "danger",
      action: async () => {
        await api.deleteUser(user.id);
        if (data.items.length === 1 && page > 1)
          setPage((current) => current - 1);
        reload(`${user.fullName}'s account was deleted.`);
      },
    });
  }

  async function saveRole(roleId: string | null, input: RoleInput) {
    if (!roleId)
      throw new Error("System roles cannot be created from this workspace.");
    await api.updateRole(roleId, input);
    reload("Role definition updated.");
  }

  return (
    <section className="card data-card users-workspace">
      <div className="section-heading">
        <div>
          <span className="eyebrow">ACCESS CONTROL</span>
          <h3>Accounts &amp; access</h3>
          <p className="section-description">
            Manage passenger and Administrator access. Driver accounts and
            transport records are maintained in Drivers &amp; QR.
          </p>
        </div>
        {view !== "roles" && (
          <button
            className="primary"
            onClick={() => setCreatingUser(true)}
            type="button"
          >
            ＋ Create{" "}
            {view === "administrators" ? "Administrator" : "passenger"}
          </button>
        )}
      </div>
      <div
        className="workspace-tabs"
        role="tablist"
        aria-label="User management sections"
      >
        <button
          className={view === "passengers" ? "active" : ""}
          onClick={() => changeView("passengers")}
          role="tab"
          aria-selected={view === "passengers"}
          type="button"
        >
          Passengers{" "}
          <span>
            {roles.find((item) => item.key === "PASSENGER")?._count.users ?? 0}
          </span>
        </button>
        <button
          className={view === "administrators" ? "active" : ""}
          onClick={() => changeView("administrators")}
          role="tab"
          aria-selected={view === "administrators"}
          type="button"
        >
          Administrators{" "}
          <span>
            {roles.find((item) => item.key === "LGU_ADMIN")?._count.users ?? 0}
          </span>
        </button>
        <button
          className={view === "roles" ? "active" : ""}
          onClick={() => changeView("roles")}
          role="tab"
          aria-selected={view === "roles"}
          type="button"
        >
          Roles <span>{roles.length}</span>
        </button>
      </div>
      {error && (
        <ErrorMessage
          message={error}
          onRetry={() => setReloadKey((value) => value + 1)}
        />
      )}
      {view === "roles" ? (
        <RoleManager
          roles={roles}
          onSave={saveRole}
          onError={(message) => showToast("error", message)}
        />
      ) : (
        <>
          <DataToolbar
            search={search}
            onSearch={(value) => {
              setSearch(value);
              setPage(1);
            }}
            searchLabel="Search name, username, email, or phone"
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
          ) : waitingForAccounts ? (
            <div
              className="account-loading-reserve"
              role="status"
              aria-label="Loading accounts"
            />
          ) : data.items.length === 0 ? (
            <EmptyState
              title="No matching users"
              text="Try changing your search or account-status filter."
            />
          ) : (
            <UserTable
              users={data.items}
              startNumber={(page - 1) * pageSize + 1}
              showUsername={view === "passengers"}
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
      {toast && (
        <ToastNotification
          key={toast.id}
          toast={toast}
          onDismiss={dismissToast}
        />
      )}
      {confirmation && (
        <ConfirmModal
          title={confirmation.title}
          message={confirmation.message}
          confirmLabel={confirmation.confirmLabel}
          tone={confirmation.tone}
          onConfirm={confirmation.action}
          onCancel={() => setConfirmation(null)}
          onError={(message) => showToast("error", message)}
        />
      )}
      {(creatingUser || editingUser) && (
        <UserForm
          user={editingUser}
          roles={roles}
          onCancel={() => {
            setCreatingUser(false);
            setEditingUser(null);
          }}
          onSave={saveUser}
          onError={(message) => showToast("error", message)}
          defaultRole={view === "administrators" ? "LGU_ADMIN" : "PASSENGER"}
        />
      )}
    </section>
  );
}

function UserTable({
  users,
  startNumber,
  showUsername,
  onEdit,
  onToggleStatus,
  onDelete,
}: {
  users: DirectoryUser[];
  startNumber: number;
  showUsername: boolean;
  onEdit: (user: AdminUser) => void;
  onToggleStatus: (user: AdminUser) => void;
  onDelete: (user: AdminUser) => void;
}) {
  return (
    <div className="responsive-table" role="table" aria-label="TriSafe users">
      <div
        className={`data-row account-user-head data-head ${showUsername ? "account-user-with-username" : ""}`}
        role="row"
      >
        <span className="table-number">No.</span>
        <span>User</span>
        {showUsername && <span>Username</span>}
        <span>Contact</span>
        <span>Account</span>
        <span>Actions</span>
      </div>
      {users.map((user, index) => (
        <div
          className={`data-row account-user-row ${showUsername ? "account-user-with-username" : ""}`}
          role="row"
          key={user.id}
        >
          <span
            className="table-number"
            aria-label={`Record number ${startNumber + index}`}
          >
            {startNumber + index}
          </span>
          <div className="identity-cell">
            <span className="avatar">{initials(user.fullName)}</span>
            <span>
              <b>
                {user.role === "PASSENGER"
                  ? displayPersonName(user.fullName)
                  : user.fullName}
              </b>
              <small>
                Created {new Date(user.createdAt).toLocaleDateString("en-PH")}
              </small>
            </span>
          </div>
          {showUsername && (
            <span className="username-cell">
              <b>{user.username ? `@${user.username}` : "Not assigned"}</b>
              <small>Passenger username</small>
            </span>
          )}
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
