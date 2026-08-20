import { FormEvent, useEffect, useMemo, useState, type ReactNode } from "react";
import {
  AlertTriangle,
  BadgeCheck,
  CircleDollarSign,
  Gavel,
  Plus,
  ReceiptText,
} from "lucide-react";
import {
  api,
  CreateViolationInput,
  Driver,
  DriverViolation,
  PenaltyStatus,
  ViolationStatus,
} from "../../api";
import { DataToolbar } from "../shared/DataControls";
import { EmptyState } from "../shared/Feedback";
import { ModalShell } from "../shared/ModalShell";

export function ViolationManagement({
  drivers,
  onNotify,
}: {
  drivers: Driver[];
  onNotify: (type: "success" | "error" | "info", message: string) => void;
}) {
  const [records, setRecords] = useState<DriverViolation[]>([]);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<DriverViolation | null>(null);
  async function refresh() {
    setLoading(true);
    try {
      setRecords(await api.violations());
    } catch (error) {
      onNotify(
        "error",
        error instanceof Error
          ? error.message
          : "Unable to load violation records.",
      );
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => {
    void refresh();
  }, []);
  const filtered = useMemo(
    () =>
      records.filter((record) => {
        const value =
          `${record.category} ${record.description} ${record.driver.user.fullName} ${record.driver.vehicles[0]?.plateNumber ?? ""}`.toLowerCase();
        return (
          (!search || value.includes(search.toLowerCase())) &&
          (!status || record.status === status)
        );
      }),
    [records, search, status],
  );
  const summary = useMemo(
    () => ({
      open: records.filter((item) =>
        ["OPEN", "ACKNOWLEDGED"].includes(item.status),
      ).length,
      pending: records.filter((item) => item.penaltyStatus === "PENDING")
        .length,
      paid: records.filter((item) => item.penaltyStatus === "PAID").length,
    }),
    [records],
  );
  return (
    <div className="violation-workspace">
      <section className="violation-summary">
        <ViolationMetric
          icon={<Gavel />}
          label="Open cases"
          value={summary.open}
          detail="Require LGU action"
        />
        <ViolationMetric
          icon={<CircleDollarSign />}
          label="Pending penalties"
          value={summary.pending}
          detail="Awaiting payment or waiver"
        />
        <ViolationMetric
          icon={<BadgeCheck />}
          label="Paid penalties"
          value={summary.paid}
          detail="Recorded as settled"
        />
      </section>
      <section className="card data-card">
        <div className="section-heading">
          <div>
            <span className="eyebrow">BPLO SAFETY & COMPLIANCE</span>
            <h3>Violation & Penalty Management</h3>
            <p className="section-description">
              Record official driver violations, issue penalties, and maintain a
              traceable LGU resolution history.
            </p>
          </div>
          <button
            className="primary"
            type="button"
            onClick={() => setShowForm(true)}
          >
            <Plus /> Record violation
          </button>
        </div>
        <DataToolbar
          search={search}
          onSearch={setSearch}
          searchLabel="Search driver, plate, category, or description"
          filter={status}
          onFilter={setStatus}
          filterLabel="Case status"
          options={[
            { value: "", label: "All cases" },
            { value: "OPEN", label: "Open" },
            { value: "ACKNOWLEDGED", label: "Acknowledged" },
            { value: "RESOLVED", label: "Resolved" },
            { value: "DISMISSED", label: "Dismissed" },
          ]}
          resultCount={filtered.length}
        />
        {loading ? (
          <div className="violation-loading">
            Loading official violation records…
          </div>
        ) : filtered.length === 0 ? (
          <EmptyState
            title="No matching violation records"
            text={
              records.length
                ? "Try changing your search or status filter."
                : "Record an official violation when the LGU determines action is required."
            }
          />
        ) : (
          <div className="violation-list">
            {filtered.map((record) => (
              <ViolationRow
                record={record}
                key={record.id}
                onEdit={() => setEditing(record)}
              />
            ))}
          </div>
        )}
      </section>
      {(showForm || editing) && (
        <ViolationModal
          drivers={drivers}
          record={editing ?? undefined}
          onClose={() => {
            setShowForm(false);
            setEditing(null);
          }}
          onSaved={async (message) => {
            await refresh();
            onNotify("success", message);
            setShowForm(false);
            setEditing(null);
          }}
          onError={(message) => onNotify("error", message)}
        />
      )}
    </div>
  );
}
function ViolationMetric({
  icon,
  label,
  value,
  detail,
}: {
  icon: ReactNode;
  label: string;
  value: number;
  detail: string;
}) {
  return (
    <div className="violation-metric">
      <span>{icon}</span>
      <div>
        <small>{label}</small>
        <strong>{value}</strong>
        <em>{detail}</em>
      </div>
    </div>
  );
}
function ViolationRow({
  record,
  onEdit,
}: {
  record: DriverViolation;
  onEdit: () => void;
}) {
  const plate = record.driver.vehicles[0]?.plateNumber ?? "No vehicle";
  return (
    <article className="violation-row">
      <span className={`status ${record.status.toLowerCase()}`}>
        {record.status.replaceAll("_", " ")}
      </span>
      <div>
        <strong>{record.category}</strong>
        <p>{record.description}</p>
        <small>
          {record.driver.user.fullName} · {plate} ·{" "}
          {formatDate(record.occurredAt)}
        </small>
      </div>
      <div className="violation-penalty">
        <b>
          {record.penaltyAmount
            ? `₱${Number(record.penaltyAmount).toFixed(2)}`
            : "No penalty"}
        </b>
        <small>
          {record.penaltyStatus.replaceAll("_", " ")}
          {record.dueAt ? ` · Due ${formatDate(record.dueAt)}` : ""}
        </small>
      </div>
      <button className="row-action" type="button" onClick={onEdit}>
        <ReceiptText /> Manage
      </button>
    </article>
  );
}
function ViolationModal({
  drivers,
  record,
  onClose,
  onSaved,
  onError,
}: {
  drivers: Driver[];
  record?: DriverViolation;
  onClose: () => void;
  onSaved: (message: string) => Promise<void>;
  onError: (message: string) => void;
}) {
  const [values, setValues] = useState<CreateViolationInput>({
    driverId: "",
    category: "",
    description: "",
    occurredAt: new Date().toISOString().slice(0, 10),
    penaltyAmount: undefined,
    dueAt: "",
    notes: "",
  });
  const [caseStatus, setCaseStatus] = useState<ViolationStatus>(
    record?.status ?? "OPEN",
  );
  const [penaltyStatus, setPenaltyStatus] = useState<PenaltyStatus>(
    record?.penaltyStatus ?? "NOT_APPLICABLE",
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  useEffect(() => {
    if (record)
      setValues({
        driverId: record.driverId,
        category: record.category,
        description: record.description,
        occurredAt: record.occurredAt.slice(0, 10),
        penaltyAmount: record.penaltyAmount
          ? Number(record.penaltyAmount)
          : undefined,
        dueAt: record.dueAt?.slice(0, 10) ?? "",
        notes: record.notes ?? "",
      });
  }, [record]);
  async function submit(event: FormEvent) {
    event.preventDefault();
    setError("");
    if (!record && !values.driverId) {
      setError("Select the registered driver involved in this violation.");
      return;
    }
    if (!values.category.trim() || !values.description.trim()) {
      setError("Enter the violation category and official description.");
      return;
    }
    if (values.dueAt && values.dueAt < values.occurredAt) {
      setError("The due date cannot be earlier than the violation date.");
      return;
    }
    if (
      penaltyStatus !== "NOT_APPLICABLE" &&
      (!values.penaltyAmount || values.penaltyAmount <= 0)
    ) {
      setError("Enter a penalty amount before assigning a penalty status.");
      return;
    }
    setSaving(true);
    try {
      if (record)
        await api.updateViolation(record.id, {
          status: caseStatus,
          penaltyStatus,
          penaltyAmount: values.penaltyAmount ?? null,
          dueAt: values.dueAt || null,
          notes: values.notes || null,
        });
      else
        await api.createViolation({
          ...values,
          category: values.category.trim(),
          description: values.description.trim(),
          dueAt: values.dueAt || undefined,
          notes: values.notes || undefined,
        });
      await onSaved(
        record
          ? "Violation record updated successfully."
          : "Official violation record created successfully.",
      );
    } catch (reason) {
      const message =
        reason instanceof Error
          ? reason.message
          : "Unable to save the violation record.";
      setError(message);
      onError(message);
    } finally {
      setSaving(false);
    }
  }
  return (
    <ModalShell
      eyebrow="OFFICIAL COMPLIANCE RECORD"
      title={record ? "Manage violation record" : "Record driver violation"}
      description="Only record an LGU-determined violation. Every change is retained in the audit trail."
      onClose={onClose}
      busy={saving}
      size="large"
      className="violation-modal"
      footer={
        <>
          <button
            className="secondary"
            type="button"
            onClick={onClose}
            disabled={saving}
          >
            Cancel
          </button>
          <button
            className="primary"
            type="submit"
            form="violation-form"
            disabled={saving}
          >
            {saving ? "Saving…" : record ? "Save record" : "Create violation"}
          </button>
        </>
      }
    >
      <form id="violation-form" className="violation-form" onSubmit={submit}>
        {error && (
          <div className="error" role="alert">
            {error}
          </div>
        )}
        <div className="form-grid">
          {!record && (
            <label className="field field-wide">
              <span>
                Registered driver <em>*</em>
              </span>
              <select
                value={values.driverId}
                onChange={(event) =>
                  setValues((current) => ({
                    ...current,
                    driverId: event.target.value,
                  }))
                }
                required
              >
                <option value="">Select registered driver</option>
                {drivers.map((driver) => (
                  <option key={driver.id} value={driver.id}>
                    {driver.fullName} ·{" "}
                    {driver.vehicles[0]?.plateNumber ?? "No plate"}
                  </option>
                ))}
              </select>
            </label>
          )}
          <label className="field">
            <span>
              Violation category <em>*</em>
            </span>
            <input
              value={values.category}
              maxLength={80}
              onChange={(event) =>
                setValues((current) => ({
                  ...current,
                  category: event.target.value,
                }))
              }
              placeholder="e.g., Unsafe operation"
              required
            />
          </label>
          <label className="field">
            <span>
              Violation date <em>*</em>
            </span>
            <input
              type="date"
              value={values.occurredAt}
              onChange={(event) =>
                setValues((current) => ({
                  ...current,
                  occurredAt: event.target.value,
                }))
              }
              required
            />
          </label>
          <label className="field field-wide">
            <span>
              Official description <em>*</em>
            </span>
            <textarea
              rows={4}
              value={values.description}
              maxLength={2000}
              onChange={(event) =>
                setValues((current) => ({
                  ...current,
                  description: event.target.value,
                }))
              }
              required
            />
          </label>
          {record && (
            <label className="field">
              <span>Case status</span>
              <select
                value={caseStatus}
                onChange={(event) =>
                  setCaseStatus(event.target.value as ViolationStatus)
                }
              >
                {["OPEN", "ACKNOWLEDGED", "RESOLVED", "DISMISSED"].map(
                  (value) => (
                    <option key={value}>{value}</option>
                  ),
                )}
              </select>
            </label>
          )}
          <label className="field">
            <span>Penalty amount</span>
            <input
              type="number"
              min="0"
              step="0.01"
              value={values.penaltyAmount ?? ""}
              onChange={(event) =>
                setValues((current) => ({
                  ...current,
                  penaltyAmount: event.target.value
                    ? Number(event.target.value)
                    : undefined,
                }))
              }
            />
          </label>
          <label className="field">
            <span>Penalty status</span>
            <select
              value={penaltyStatus}
              onChange={(event) =>
                setPenaltyStatus(event.target.value as PenaltyStatus)
              }
            >
              {["NOT_APPLICABLE", "PENDING", "PAID", "WAIVED"].map((value) => (
                <option key={value}>{value.replaceAll("_", " ")}</option>
              ))}
            </select>
          </label>
          <label className="field">
            <span>Penalty due date</span>
            <input
              type="date"
              min={values.occurredAt}
              value={values.dueAt ?? ""}
              onChange={(event) =>
                setValues((current) => ({
                  ...current,
                  dueAt: event.target.value,
                }))
              }
            />
          </label>
          <label className="field field-wide">
            <span>Administrative notes</span>
            <textarea
              rows={3}
              value={values.notes ?? ""}
              maxLength={2000}
              onChange={(event) =>
                setValues((current) => ({
                  ...current,
                  notes: event.target.value,
                }))
              }
            />
          </label>
        </div>
      </form>
    </ModalShell>
  );
}
function formatDate(value: string) {
  return new Date(value).toLocaleDateString("en-PH", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}
