import { useMemo, useState } from "react";
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
};
const pageSize = 8;

export function FareMatrixPanel({ rules, locations, onChanged }: Props) {
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
          (!status || (status === "ACTIVE") === rule.active)
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
    } catch (requestError) {
      const message = requestError instanceof Error
        ? requestError.message
        : "Unable to update the fare rule.";
      setError(message);
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
  if (showForm || editing)
    return (
      <FareRuleForm
        locations={locations}
        rule={editing}
        onCancel={() => {
          setEditing(undefined);
          setShowForm(false);
        }}
        onSave={save}
      />
    );

  return (
    <div className="fare-workspace">
      <LiveTransportMap />
      <VehicleFarePolicyPanel />
      <section className="card data-card fare-matrix">
      <div className="section-heading">
        <div>
          <span className="eyebrow">ROUTE PLANNING</span>
          <h3>Published route estimates</h3>
          <p className="section-description">
            Route distances provide a pre-ride estimate. The completed fare is
            recalculated from tracked GPS distance using the vehicle rates above.
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
          { value: "ACTIVE", label: "Active" },
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
            <div className="data-row fare-table-row" key={rule.id}>
              <span>
                <b>{rule.fromLocation.name}</b>
                <small>
                  to {rule.toLocation.name} ·{" "}
                  {Number(rule.distanceKm).toFixed(1)} km
                </small>
              </span>
              <span>
                <b>₱{Number(rule.baseFare).toFixed(2)} base</b>
                <small>
                  + ₱{Number(rule.perKm).toFixed(2)}/km · minimum ₱
                  {Number(rule.minimumFare).toFixed(2)}
                </small>
              </span>
              <span>
                <b>{rule.version}</b>
                <small>Official matrix</small>
              </span>
              <span>
                <b>
                  {new Date(rule.effectiveFrom).toLocaleDateString("en-PH")}
                </b>
                <small>
                  {rule.effectiveTo
                    ? `Until ${new Date(rule.effectiveTo).toLocaleDateString("en-PH")}`
                    : "No end date"}
                </small>
              </span>
              <span
                className={`status ${rule.active ? "verified" : "dismissed"}`}
              >
                {rule.active ? "ACTIVE" : "INACTIVE"}
              </span>
              <span className="row-menu">
                <button
                  className="row-action"
                  onClick={() => setEditing(rule)}
                  type="button"
                >
                  Edit
                </button>
                <button
                  className={`row-action ${rule.active ? "danger-action" : ""}`}
                  disabled={changing === rule.id}
                  onClick={() => void setRuleActive(rule, !rule.active)}
                  type="button"
                >
                  {changing === rule.id
                    ? "Updating…"
                    : rule.active
                      ? "Deactivate"
                      : "Activate"}
                </button>
              </span>
            </div>
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
    </div>
  );
}
