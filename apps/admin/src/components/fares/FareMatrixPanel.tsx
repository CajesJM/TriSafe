import { useMemo, useState, type ReactNode } from "react";
import { CalendarClock, CircleCheckBig, MapPinned } from "lucide-react";
import { api, FareRule, FareRuleInput, LocationOption } from "../../api";
import { DataToolbar, Pagination } from "../shared/DataControls";
import { EmptyState } from "../shared/Feedback";
import { FareRuleForm } from "./FareRuleForm";
import { LiveTransportMap } from "./LiveTransportMap";
import { VehicleFarePolicyPanel } from "./VehicleFarePolicyPanel";
import { ConfirmModal } from "../shared/ConfirmModal";

type Props = {
  rules: FareRule[];
  locations: LocationOption[];
  onChanged: () => Promise<void>;
  onNotify: (type: "success" | "error" | "info", message: string) => void;
};
const pageSize = 8;

export function FareMatrixPanel({ rules, locations, onChanged, onNotify }: Props) {
  const [editing, setEditing] = useState<FareRule>();
  const [showForm, setShowForm] = useState(false);
  const [error, setError] = useState("");
  const [changing, setChanging] = useState("");
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [page, setPage] = useState(1);
  const [ruleToDeactivate, setRuleToDeactivate] = useState<FareRule>();
  const filtered = useMemo(
    () =>
      rules.filter((rule) => {
        const text =
          `${rule.fromLocation.name} ${rule.toLocation.name} ${rule.version}`.toLowerCase();
        return (
          (!search || text.includes(search.toLowerCase())) &&
          (!status || getFareRuleState(rule) === status)
        );
      }),
    [rules, search, status],
  );
  const visible = filtered.slice((page - 1) * pageSize, page * pageSize);

  async function save(input: FareRuleInput) {
    editing
      ? await api.updateFareRule(editing.id, input)
      : await api.createFareRule(input);
    await onChanged();
    onNotify(
      "success",
      editing
        ? "Official route fare rule updated successfully."
        : "Official route fare rule published successfully.",
    );
    setEditing(undefined);
    setShowForm(false);
  }
  async function applyRuleStatus(rule: FareRule, active: boolean) {
    setError("");
    setChanging(rule.id);
    try {
      active
        ? await api.activateFareRule(rule.id)
        : await api.deactivateFareRule(rule.id);
      await onChanged();
      onNotify(
        "success",
        active
          ? `${routeLabel(rule)} was activated for fare estimates.`
          : `${routeLabel(rule)} was deactivated. Existing ride records were not changed.`,
      );
    } catch (requestError) {
      const message = requestError instanceof Error
        ? requestError.message
        : "Unable to update the fare rule.";
      setError(message);
      onNotify("error", message);
      throw new Error(message);
    } finally {
      setChanging("");
    }
  }
  async function setRuleActive(rule: FareRule, active: boolean) {
    if (!active) {
      setRuleToDeactivate(rule);
      return;
    }
    try {
      await applyRuleStatus(rule, active);
    } catch {
      // The inline error panel already explains an activation failure.
    }
  }
  function updateSearch(value: string) {
    setSearch(value);
    setPage(1);
  }
  function updateStatus(value: string) {
    setStatus(value);
    setPage(1);
  }
  return (
    <div className="fare-workspace">
      <FareMatrixSummary rules={rules} />
      <VehicleFarePolicyPanel onChanged={onChanged} onNotify={onNotify} />
      <LiveTransportMap />
      <section className="card data-card fare-matrix">
      <div className="section-heading">
        <div>
          <span className="eyebrow">OFFICIAL ROUTE MATRIX</span>
          <h3>Route fare rules</h3>
          <p className="section-description">
            Publish transparent location-to-location estimates. The passenger
            ride service recalculates the final fare from accepted GPS distance
            and the active vehicle policy.
          </p>
        </div>
        <button
          className="primary"
          onClick={() => {
            setError("");
            setShowForm(true);
          }}
          type="button"
        >
          ＋ Add fare rule
        </button>
      </div>
      {error && (
        <div className="error" role="alert">
          {error}
        </div>
      )}
      <DataToolbar
        search={search}
        onSearch={updateSearch}
        searchLabel="Search route or matrix version"
        filter={status}
        onFilter={updateStatus}
        filterLabel="Status"
        options={[
          { value: "", label: "All rules" },
          { value: "CURRENT", label: "Current" },
          { value: "SCHEDULED", label: "Scheduled" },
          { value: "EXPIRED", label: "Expired" },
          { value: "INACTIVE", label: "Inactive" },
        ]}
        resultCount={filtered.length}
      />
      {visible.length === 0 ? (
        <EmptyState
          title="No matching fare rules"
          text={
            rules.length
              ? "Try changing your filters."
              : "Publish the first official LGU route rule."
          }
        />
      ) : (
        <div className="responsive-table">
          <div className="data-row fare-table-head data-head">
            <span>Route</span>
            <span>Fare calculation</span>
            <span>Version</span>
            <span>Effective date</span>
            <span>Status</span>
            <span>Actions</span>
          </div>
          {visible.map((rule) => (
            <FareRuleRow
              key={rule.id}
              rule={rule}
              changing={changing === rule.id}
              onEdit={() => setEditing(rule)}
              onStatusChange={(active) => void setRuleActive(rule, active)}
            />
          ))}
        </div>
      )}
      {filtered.length > 0 && (
        <Pagination
          page={page}
          pageSize={pageSize}
          total={filtered.length}
          onPageChange={setPage}
        />
      )}
      </section>
      {ruleToDeactivate && (
        <ConfirmModal
          title="Deactivate this official fare rule?"
          message={`${ruleToDeactivate.fromLocation.name} to ${ruleToDeactivate.toLocation.name} will no longer be available for new fare estimates. Existing ride records will not be changed.`}
          confirmLabel="Deactivate rule"
          tone="warning"
          onConfirm={() => applyRuleStatus(ruleToDeactivate, false)}
          onCancel={() => setRuleToDeactivate(undefined)}
        />
      )}
      {(showForm || editing) && (
        <FareRuleForm
          locations={locations}
          rule={editing}
          onCancel={() => {
            setEditing(undefined);
            setShowForm(false);
          }}
          onSave={save}
        />
      )}
    </div>
  );
}

function FareMatrixSummary({ rules }: { rules: FareRule[] }) {
  const summary = useMemo(() => ({
    total: rules.length,
    current: rules.filter((rule) => getFareRuleState(rule) === "CURRENT").length,
    scheduled: rules.filter((rule) => getFareRuleState(rule) === "SCHEDULED").length,
    expired: rules.filter((rule) => getFareRuleState(rule) === "EXPIRED").length,
  }), [rules]);
  return <section className="fare-matrix-summary" aria-label="Official fare matrix overview">
    <div className="fare-matrix-summary-lead"><span>Official route rules</span><strong>{summary.total}</strong><small>published LGU route rules</small></div>
    <FareMetric icon={<CircleCheckBig />} label="Current rules" value={summary.current} detail="Available to passenger estimates" />
    <FareMetric icon={<CalendarClock />} label="Scheduled rules" value={summary.scheduled} detail="Waiting for the effective date" />
    <FareMetric icon={<MapPinned />} label="Expired rules" value={summary.expired} detail="Review or publish a replacement" emphasis={summary.expired > 0} />
  </section>;
}

function FareMetric({ icon, label, value, detail, emphasis = false }: { icon: ReactNode; label: string; value: number; detail: string; emphasis?: boolean }) {
  return <div className={`fare-matrix-metric${emphasis ? " needs-attention" : ""}`}><span className="fare-matrix-metric-icon" aria-hidden="true">{icon}</span><div><span>{label}</span><strong>{value}</strong><small>{detail}</small></div></div>;
}

function FareRuleRow({ rule, changing, onEdit, onStatusChange }: { rule: FareRule; changing: boolean; onEdit: () => void; onStatusChange: (active: boolean) => void }) {
  const state = getFareRuleState(rule);
  return <div className="data-row fare-table-row">
    <span><b>{rule.fromLocation.name}</b><small>to {rule.toLocation.name} · {Number(rule.distanceKm).toFixed(1)} km</small></span>
    <span><b>₱{Number(rule.baseFare).toFixed(2)} base</b><small>+ ₱{Number(rule.perKm).toFixed(2)}/km · minimum ₱{Number(rule.minimumFare).toFixed(2)}</small></span>
    <span><b>{rule.version}</b><small>Official matrix version</small></span>
    <span><b>{formatDate(rule.effectiveFrom)}</b><small>{rule.effectiveTo ? `Until ${formatDate(rule.effectiveTo)}` : "No end date"}</small></span>
    <span className={`status ${fareStateClass(state)}`}>{state}</span>
    <span className="row-menu"><button className="row-action" onClick={onEdit} type="button">Edit</button><button className={`row-action ${rule.active ? "danger-action" : ""}`} disabled={changing} onClick={() => onStatusChange(!rule.active)} type="button">{changing ? "Updating…" : rule.active ? "Deactivate" : "Activate"}</button></span>
  </div>;
}

type FareRuleState = "CURRENT" | "SCHEDULED" | "EXPIRED" | "INACTIVE";

function getFareRuleState(rule: FareRule): FareRuleState {
  if (!rule.active) return "INACTIVE";
  const now = new Date();
  const start = new Date(rule.effectiveFrom);
  const end = rule.effectiveTo ? new Date(rule.effectiveTo) : undefined;
  if (start > now) return "SCHEDULED";
  if (end && end <= now) return "EXPIRED";
  return "CURRENT";
}

function fareStateClass(state: FareRuleState) {
  return state === "CURRENT" ? "verified" : state === "SCHEDULED" ? "pending" : state === "EXPIRED" ? "expired" : "dismissed";
}

function routeLabel(rule: FareRule) {
  return `${rule.fromLocation.name} to ${rule.toLocation.name}`;
}

function formatDate(value: string) {
  return new Date(value).toLocaleDateString("en-PH", { year: "numeric", month: "short", day: "numeric" });
}
