import { useMemo, useState } from "react";
import { Incident, IncidentReviewInput } from "../../api";
import { DataToolbar, Pagination } from "../shared/DataControls";
import { EmptyState } from "../shared/Feedback";
import { IncidentReviewCard } from "./IncidentReviewCard";
import { ArrowUpDown, ShieldAlert, SlidersHorizontal } from "lucide-react";
import type { ToastMessage } from "../shared/ToastNotification";

const pageSize = 5;
type IncidentSort = "NEWEST" | "OLDEST";
export function IncidentReview({
  incidents,
  onReview,
  onNotify,
}: {
  incidents: Incident[];
  onReview: (id: string, review: IncidentReviewInput) => Promise<void>;
  onNotify: (type: ToastMessage["type"], message: string) => void;
}) {
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [sort, setSort] = useState<IncidentSort>("NEWEST");
  const [page, setPage] = useState(1);
  const filtered = useMemo(
    () =>
      incidents
        .filter((incident) => {
          const text =
            `${incident.category} ${incident.rawDescription} ${incident.aiDraft ?? ""} ${incident.passenger.fullName} ${incident.ride?.vehicle.plateNumber ?? ""}`.toLowerCase();
          return (
            (!search || text.includes(search.toLowerCase())) &&
            (!status || incident.status === status)
          );
        })
        .sort((left, right) => {
          const difference =
            new Date(right.createdAt).getTime() -
            new Date(left.createdAt).getTime();
          return sort === "NEWEST" ? difference : -difference;
        }),
    [incidents, search, sort, status],
  );
  const visible = filtered.slice((page - 1) * pageSize, page * pageSize);
  const counts = {
    submitted: incidents.filter((incident) => incident.status === "SUBMITTED").length,
    reviewing: incidents.filter((incident) => incident.status === "UNDER_REVIEW").length,
    closed: incidents.filter((incident) => ["RESOLVED", "DISMISSED"].includes(incident.status)).length,
  };
  function updateSearch(value: string) {
    setSearch(value);
    setPage(1);
  }
  function updateStatus(value: string) {
    setStatus(value);
    setPage(1);
  }
  return (
    <section className="card data-card incident-workspace">
      <div className="incident-top-grid">
        <div className="section-heading incident-hero">
          <div className="incident-heading-main">
            <span className="eyebrow">PASSENGER SAFETY</span>
            <h3>Incident Reports</h3>
            <p className="section-description">
              Review passenger reports, verify ride evidence, and record LGU
              decisions from one workspace.
            </p>
          </div>
          <ShieldAlert className="incident-hero-mark" aria-hidden="true" />
        </div>
        <IncidentStatusChart counts={counts} total={incidents.length} />
      </div>
      <DataToolbar
        search={search}
        onSearch={updateSearch}
        searchLabel="Search passenger, category, plate, or report"
        additionalFilter={
          <div className="incident-table-controls">
            <label className="data-filter incident-status-filter">
              <span>Status</span>
              <select value={status} onChange={(event) => updateStatus(event.target.value)}>
                <option value="">All statuses</option>
                <option value="SUBMITTED">Submitted</option>
                <option value="UNDER_REVIEW">Under review</option>
                <option value="RESOLVED">Resolved</option>
                <option value="DISMISSED">Dismissed</option>
              </select>
            </label>
            <label className="data-filter incident-sort-filter">
              <span>Sort reports</span>
              <select
                value={sort}
                onChange={(event) => {
                  setSort(event.target.value as IncidentSort);
                  setPage(1);
                }}
              >
                <option value="NEWEST">Sort by: newest</option>
                <option value="OLDEST">Sort by: oldest</option>
              </select>
              <ArrowUpDown aria-hidden="true" />
            </label>
            <button
              className="incident-view-reset"
              type="button"
              title="Reset search, status, and sorting"
              aria-label="Reset incident report view"
              onClick={() => {
                setSearch("");
                setStatus("");
                setSort("NEWEST");
                setPage(1);
              }}
            >
              <SlidersHorizontal aria-hidden="true" />
            </button>
          </div>
        }
      />
      <div className="incident-list">
        {visible.map((incident) => (
          <IncidentReviewCard
            incident={incident}
            onReview={onReview}
            onNotify={onNotify}
            key={incident.id}
          />
        ))}
        {visible.length === 0 && (
          <EmptyState
            title="No matching reports"
            text={
              incidents.length
                ? "Try changing your search or status filter."
                : "No passenger reports have been submitted."
            }
          />
        )}
      </div>
      {filtered.length > 0 && (
        <Pagination
          page={page}
          pageSize={pageSize}
          total={filtered.length}
          onPageChange={setPage}
        />
      )}
    </section>
  );
}

function IncidentStatusChart({
  counts,
  total,
}: {
  counts: { submitted: number; reviewing: number; closed: number };
  total: number;
}) {
  const rows = [
    { label: "Submitted", value: counts.submitted, tone: "submitted" },
    { label: "Under review", value: counts.reviewing, tone: "reviewing" },
    { label: "Closed", value: counts.closed, tone: "closed" },
  ];
  return (
    <section className="incident-status-chart" aria-labelledby="incident-status-title">
      <div className="incident-chart-heading">
        <div>
          <span className="eyebrow">CASE STATUS</span>
          <h4 id="incident-status-title">Incident overview</h4>
        </div>
        <strong>{total}</strong>
      </div>
      <div className="incident-chart-bars">
        {rows.map((row) => {
          const percentage = total > 0 ? Math.round((row.value / total) * 100) : 0;
          return (
            <div className={`incident-chart-row ${row.tone}`} key={row.label}>
              <div><span>{row.label}</span><b>{row.value}</b></div>
              <span className="incident-chart-track"><span style={{ width: `${percentage}%` }} /></span>
              <small>{percentage}%</small>
            </div>
          );
        })}
      </div>
    </section>
  );
}
