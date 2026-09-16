import { useCallback, useEffect, useState } from "react";
import {
  AdminUser,
  api,
  CreateUserInput,
  RoleDefinition,
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
import { UserForm } from "./UserForm";
import { displayPersonName } from "../../utils/personName";
import {
  ArrowUpDown,
  FilePenLine,
  Plus,
  SlidersHorizontal,
  Trash2,
  UserCheck,
  UserX,
} from "lucide-react";
import { ActionMenu, type ActionMenuGroup } from "../shared/ActionMenu";

const pageSize = 10;
type DirectoryUser = AdminUser & { username?: string | null };
type PassengerStats = { registered: number; active: number; inactive: number };
type UserSort = "NEWEST" | "OLDEST" | "NAME_ASC" | "NAME_DESC";
const emptyUserPage: UserPage = { items: [], total: 0, page: 1, pageSize };
const accountPageCache = new Map<string, UserPage>();
let roleDefinitionCache: RoleDefinition[] | null = null;

function accountCacheKey(
  role: string,
  search: string,
  status: string,
  sort: UserSort,
  page: number,
) {
  return `${role}|${search.trim().toLowerCase()}|${status}|${sort}|${page}`;
}
type Confirmation = {
  title: string;
  message: string;
  confirmLabel: string;
  tone: "danger" | "warning";
  action: () => Promise<void>;
};
export function UserDirectory({
  managementRole,
}: {
  managementRole: "PASSENGER" | "LGU_ADMIN";
}) {
  const isAdministrator = managementRole === "LGU_ADMIN";
  const initialCacheKey = accountCacheKey(managementRole, "", "", "NEWEST", 1);
  const initialCachedPage = accountPageCache.get(initialCacheKey);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [sort, setSort] = useState<UserSort>("NEWEST");
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
  const [passengerStats, setPassengerStats] = useState<PassengerStats | null>(
    null,
  );
  const [passengerStatsFailed, setPassengerStatsFailed] = useState(false);

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
    const controller = new AbortController();
    const cacheKey = accountCacheKey(
      managementRole,
      search,
      status,
      sort,
      page,
    );
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
          .users({ search, role: managementRole, status, sort, page, pageSize })
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
  }, [search, status, sort, page, reloadKey, managementRole]);

  useEffect(() => {
    if (isAdministrator) return;
    let cancelled = false;
    setPassengerStatsFailed(false);
    Promise.all([
      api.users({ role: "PASSENGER", page: 1, pageSize: 5 }),
      api.users({ role: "PASSENGER", status: "ACTIVE", page: 1, pageSize: 5 }),
      api.users({
        role: "PASSENGER",
        status: "INACTIVE",
        page: 1,
        pageSize: 5,
      }),
    ])
      .then(([registered, active, inactive]) => {
        if (!cancelled) {
          setPassengerStats({
            registered: registered.total,
            active: active.total,
            inactive: inactive.total,
          });
        }
      })
      .catch(() => {
        if (!cancelled) {
          setPassengerStats(null);
          setPassengerStatsFailed(true);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [isAdministrator, reloadKey]);

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

  return (
    <section
      className={`card data-card users-workspace ${isAdministrator ? "administrator-workspace" : "passenger-workspace"}`}
    >
      {isAdministrator ? (
        <div className="section-heading">
          <div>
            <span className="eyebrow">BPLO ADMINISTRATION</span>
            <h3>Administrator Management</h3>
            <p className="section-description">
              Manage authorized BPLO Administrator accounts, access status, and
              account details.
            </p>
          </div>
          <button
            className="primary"
            onClick={() => setCreatingUser(true)}
            type="button"
          >
            <Plus aria-hidden="true" /> Create Administrator
          </button>
        </div>
      ) : (
        <div className="passenger-top-grid">
          <div className="section-heading passenger-hero">
            <div className="passenger-heading-main">
              <div>
                <span className="eyebrow">PASSENGER MANAGEMENT</span>
                <h3>Passenger Directory</h3>
                <p className="section-description">
                  Review passenger identities, contact details, and account
                  access from one workspace.
                </p>
              </div>
            </div>
          </div>
          <PassengerStatusChart
            stats={passengerStats}
            failed={passengerStatsFailed}
          />
        </div>
      )}
      {isAdministrator && (
        <ManagementSummary
          role={managementRole}
          total={data.total}
          visible={data.items}
        />
      )}
      {error && (
        <ErrorMessage
          message={error}
          onRetry={() => setReloadKey((value) => value + 1)}
        />
      )}
      <>
        <DataToolbar
          search={search}
          onSearch={(value) => {
            setSearch(value);
            setPage(1);
          }}
          searchLabel="Search name, username, email, or phone"
          resultCount={isAdministrator ? data.total : undefined}
          additionalFilter={
            isAdministrator ? (
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
            ) : (
              <div className="passenger-table-controls">
                <label className="data-filter passenger-status-filter">
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
                <label className="data-filter passenger-sort-filter">
                  <span>Sort passengers</span>
                  <select
                    value={sort}
                    onChange={(event) => {
                      setSort(event.target.value as UserSort);
                      setPage(1);
                    }}
                  >
                    <option value="NEWEST">Sort by: newest</option>
                    <option value="OLDEST">Sort by: oldest</option>
                    <option value="NAME_ASC">Name: A–Z</option>
                    <option value="NAME_DESC">Name: Z–A</option>
                  </select>
                  <ArrowUpDown aria-hidden="true" />
                </label>
                <button
                  className="passenger-view-reset"
                  type="button"
                  title="Reset search, status, and sorting"
                  aria-label="Reset passenger table view"
                  onClick={() => {
                    setSearch("");
                    setStatus("");
                    setSort("NEWEST");
                    setPage(1);
                  }}
                >
                  <SlidersHorizontal aria-hidden="true" />
                </button>
                <button
                  className="primary passenger-toolbar-add"
                  onClick={() => setCreatingUser(true)}
                  type="button"
                >
                  <Plus aria-hidden="true" /> Add passenger
                </button>
              </div>
            )
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
            title={
              isAdministrator
                ? "No matching Administrator accounts"
                : "No matching Passenger accounts"
            }
            text={
              isAdministrator
                ? "Create an authorized BPLO Administrator or change your search and account-status filter."
                : "Create a Passenger account or change your search and account-status filter."
            }
          />
        ) : (
          <UserTable
            users={data.items}
            startNumber={(page - 1) * pageSize + 1}
            showUsername={!isAdministrator}
            roleLabel={isAdministrator ? "Administrator" : "Passenger"}
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
      {toast && (
        <ToastNotification
          key={toast.id}
          toast={toast}
          onDismiss={dismissToast}
          variant={isAdministrator ? "default" : "dashboard"}
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
          defaultRole={managementRole}
          fixedRole={managementRole}
        />
      )}
    </section>
  );
}

function UserTable({
  users,
  startNumber,
  showUsername,
  roleLabel,
  onEdit,
  onToggleStatus,
  onDelete,
}: {
  users: DirectoryUser[];
  startNumber: number;
  showUsername: boolean;
  roleLabel: "Passenger" | "Administrator";
  onEdit: (user: AdminUser) => void;
  onToggleStatus: (user: AdminUser) => void;
  onDelete: (user: AdminUser) => void;
}) {
  return (
    <div
      className="responsive-table"
      role="table"
      aria-label={`TriSafe ${roleLabel.toLowerCase()} accounts`}
    >
      <div
        className={`data-row account-user-head data-head ${showUsername ? "account-user-with-username" : ""}`}
        role="row"
      >
        <span className="table-number">No.</span>
        <span>{roleLabel}</span>
        {showUsername && <span>Username</span>}
        <span>Contact</span>
        <span>Account</span>
        {showUsername && <span>Date created</span>}
        <span>Actions</span>
      </div>
      {users.map((user, index) => {
        const passengerActionGroups: ActionMenuGroup[] = [
          {
            label: "Account",
            items: [
              {
                label: "Edit passenger",
                icon: <FilePenLine />,
                onSelect: () => onEdit(user),
              },
              {
                label:
                  user.status === "ACTIVE"
                    ? "Deactivate account"
                    : "Activate account",
                icon: user.status === "ACTIVE" ? <UserX /> : <UserCheck />,
                onSelect: () => onToggleStatus(user),
                tone: user.status === "ACTIVE" ? "danger" : "default",
              },
            ],
          },
          {
            label: "Danger zone",
            items: [
              {
                label: "Delete passenger account",
                icon: <Trash2 />,
                onSelect: () => onDelete(user),
                tone: "danger",
              },
            ],
          },
        ];
        return (
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
              <span className="avatar">
                {user.avatarData ? (
                  <img src={user.avatarData} alt="" />
                ) : (
                  initials(user.fullName)
                )}
              </span>
              <span>
                <b>
                  {user.role === "PASSENGER"
                    ? displayPersonName(user.fullName)
                    : user.fullName}
                </b>
                <small>{roleLabel}</small>
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
            {showUsername && (
              <span className="date-created-cell">
                <b>
                  {new Date(user.createdAt).toLocaleDateString("en-PH", {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                  })}
                </b>
                <small>
                  {new Date(user.createdAt).toLocaleTimeString("en-PH", {
                    hour: "numeric",
                    minute: "2-digit",
                  })}
                </small>
              </span>
            )}
            <span className="row-menu">
              {showUsername ? (
                <ActionMenu
                  iconOnly
                  label={`Actions for ${displayPersonName(user.fullName)}`}
                  groups={passengerActionGroups}
                />
              ) : (
                <>
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
                </>
              )}
            </span>
          </div>
        );
      })}
    </div>
  );
}

function ManagementSummary({
  role,
  total,
  visible,
}: {
  role: "PASSENGER" | "LGU_ADMIN";
  total: number;
  visible: DirectoryUser[];
}) {
  const activeOnPage = visible.filter(
    (user) => user.status === "ACTIVE",
  ).length;
  const inactiveOnPage = visible.filter(
    (user) => user.status === "INACTIVE",
  ).length;
  const label = role === "LGU_ADMIN" ? "Administrator" : "Passenger";
  return (
    <div
      className="management-summary"
      aria-label={`${label} management summary`}
    >
      <div>
        <span>Registered {label.toLowerCase()}s</span>
        <strong>{total}</strong>
      </div>
      <div>
        <span>Active on this page</span>
        <strong>{activeOnPage}</strong>
      </div>
      <div>
        <span>Inactive on this page</span>
        <strong>{inactiveOnPage}</strong>
      </div>
      <p>
        {role === "LGU_ADMIN"
          ? "Administrator access is protected by continuity safeguards."
          : "Passenger records are kept separate from driver and Administrator records."}
      </p>
    </div>
  );
}

function PassengerStatusChart({
  stats,
  failed,
}: {
  stats: PassengerStats | null;
  failed: boolean;
}) {
  const registered = stats?.registered ?? 0;
  const active = stats?.active ?? 0;
  const inactive = stats?.inactive ?? 0;
  const percentage = (value: number) =>
    registered > 0 ? Math.round((value / registered) * 100) : 0;
  const rows = [
    {
      label: "Registered",
      value: registered,
      percent: registered > 0 ? 100 : 0,
      tone: "registered",
    },
    {
      label: "Active",
      value: active,
      percent: percentage(active),
      tone: "active",
    },
    {
      label: "Inactive",
      value: inactive,
      percent: percentage(inactive),
      tone: "inactive",
    },
  ];

  return (
    <section
      className="passenger-status-chart"
      aria-labelledby="passenger-status-title"
    >
      <div className="passenger-chart-heading">
        <div>
          <span className="eyebrow">ACCOUNT STATUS</span>
          <h4 id="passenger-status-title">Passenger overview</h4>
        </div>
        <strong>{stats ? registered : "—"}</strong>
      </div>
      <div className="passenger-chart-bars">
        {rows.map((row) => (
          <div className={`passenger-chart-row ${row.tone}`} key={row.label}>
            <div>
              <span>{row.label}</span>
              <b>{stats ? row.value : "—"}</b>
            </div>
            <span
              className="passenger-chart-track"
              role="img"
              aria-label={`${row.label}: ${row.value} passengers, ${row.percent}% of registered passengers`}
            >
              <span style={{ width: `${row.percent}%` }} />
            </span>
            <small>
              {stats ? `${row.percent}%` : failed ? "Unavailable" : "Loading"}
            </small>
          </div>
        ))}
      </div>
    </section>
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
