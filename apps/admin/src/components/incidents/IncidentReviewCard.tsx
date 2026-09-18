import { useState } from "react";
import {
  AlertTriangle,
  CarFront,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  CircleX,
  Clock3,
  FileText,
  LoaderCircle,
  Tag,
  UserRound,
  WalletCards,
} from "lucide-react";
import { Incident, IncidentReviewInput } from "../../api";
import type { ToastMessage } from "../shared/ToastNotification";

const categories = ["SAFETY", "OVERCHARGING", "HARASSMENT", "VEHICLE", "OTHER"];

export function IncidentReviewCard({
  incident,
  onReview,
  onNotify,
}: {
  incident: Incident;
  onReview: (id: string, review: IncidentReviewInput) => Promise<void>;
  onNotify: (type: ToastMessage["type"], message: string) => void;
}) {
  const [category, setCategory] = useState(incident.category);
  const [notes, setNotes] = useState(incident.reviewerNotes ?? "");
  const [saving, setSaving] = useState(false);
  const [confirmDismiss, setConfirmDismiss] = useState(false);
  const [expanded, setExpanded] = useState(
    ["SUBMITTED", "UNDER_REVIEW"].includes(incident.status),
  );

  async function review(status: IncidentReviewInput["status"]) {
    setSaving(true);
    try {
      await onReview(incident.id, {
        status,
        category,
        reviewerNotes: notes.trim() || undefined,
      });
      const message =
        status === "UNDER_REVIEW"
          ? "Report assigned for LGU review."
          : status === "RESOLVED"
            ? "Report marked as resolved."
            : "Report dismissed and recorded.";
      onNotify("success", message);
      setConfirmDismiss(false);
    } catch (requestError) {
      onNotify(
        "error",
        requestError instanceof Error
          ? requestError.message
          : "Unable to save the review.",
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <article className={`incident-review-card ${expanded ? "expanded" : ""}`}>
      <header className="incident-card-header">
        <div className="incident-card-icon">
          <AlertTriangle size={20} />
        </div>
        <div className="incident-card-title">
          <div className="incident-card-badges">
            <span className={`status ${incident.status.toLowerCase()}`}>
              {statusLabel(incident.status)}
            </span>
            <span className="incident-category">
              <Tag size={11} /> {categoryLabel(incident.category)}
            </span>
            {incident.ride && (
              <span className="incident-ride-badge">Ride linked</span>
            )}
          </div>
          <h4>
            Incident report <span>#{incident.id.slice(-8).toUpperCase()}</span>
          </h4>
          <div className="incident-submitter">
            <UserRound size={13} /> Submitted by{" "}
            <b>{incident.passenger.fullName}</b>
            <span>•</span>
            <Clock3 size={13} /> {formatDate(incident.createdAt)}
          </div>
        </div>
        <button
          className="incident-expand-button"
          type="button"
          onClick={() => setExpanded((current) => !current)}
          aria-expanded={expanded}
        >
          {expanded ? <ChevronUp size={17} /> : <ChevronDown size={17} />}{" "}
          {expanded ? "Hide details" : "Review details"}
        </button>
      </header>

      {expanded && (
        <div className="incident-card-body">
          {incident.ride ? (
            <section
              className="incident-ride-context"
              aria-label="Related ride information"
            >
              <div>
                <CarFront size={17} />
                <span>
                  <small>Vehicle</small>
                  <b>{incident.ride.vehicle.plateNumber}</b>
                  <em>{incident.ride.vehicle.vehicleType}</em>
                </span>
              </div>
              <div>
                <UserRound size={17} />
                <span>
                  <small>Registered driver</small>
                  <b>{incident.ride.vehicle.driver.user.fullName}</b>
                </span>
              </div>
              <div>
                <WalletCards size={17} />
                <span>
                  <small>Estimated fare</small>
                  <b>PHP {Number(incident.ride.estimatedFare).toFixed(2)}</b>
                </span>
              </div>
            </section>
          ) : (
            <div className="incident-no-ride">
              <CarFront size={16} /> This report is not linked to a recorded
              ride.
            </div>
          )}

          <section
            className="incident-evidence-grid"
            aria-label="Report evidence comparison"
          >
            <article className="evidence-panel passenger-evidence">
              <div className="evidence-heading">
                <span>
                  <FileText size={16} />
                </span>
                <div>
                  <small>ORIGINAL STATEMENT</small>
                  <h5>Passenger description</h5>
                </div>
              </div>
              <p>{incident.rawDescription}</p>
            </article>
          </section>

          <section className="incident-decision-panel">
            <div className="decision-heading">
              <div>
                <span className="eyebrow">LGU DECISION</span>
                <h5>Record review outcome</h5>
                <p>
                  Confirm the category, add useful review notes, then choose the
                  appropriate outcome.
                </p>
              </div>
              <span className="decision-required">Human review required</span>
            </div>
            <div className="incident-review-fields">
              <label className="field">
                <span>Final incident category</span>
                <select
                  value={category}
                  onChange={(event) => {
                    setCategory(event.target.value);
                  }}
                >
                  {categories.map((item) => (
                    <option value={item} key={item}>
                      {categoryLabel(item)}
                    </option>
                  ))}
                </select>
              </label>
              <label className="field incident-notes">
                <span>Reviewer notes</span>
                <textarea
                  value={notes}
                  onChange={(event) => {
                    setNotes(event.target.value);
                  }}
                  placeholder="Document findings, actions taken, or required follow-up…"
                  rows={4}
                />
                <small>
                  {notes.length} characters · Include facts relevant to the LGU
                  decision.
                </small>
              </label>
            </div>
            <div className="incident-decision-actions">
              <button
                className="secondary"
                disabled={saving || incident.status === "UNDER_REVIEW"}
                onClick={() => void review("UNDER_REVIEW")}
                type="button"
              >
                <Clock3 size={15} />{" "}
                {incident.status === "UNDER_REVIEW"
                  ? "Review in progress"
                  : "Start review"}
              </button>
              <button
                className="primary"
                disabled={saving}
                onClick={() => void review("RESOLVED")}
                type="button"
              >
                {saving ? (
                  <LoaderCircle className="spin" size={15} />
                ) : (
                  <CheckCircle2 size={15} />
                )}{" "}
                Mark resolved
              </button>
              {confirmDismiss ? (
                <div className="dismiss-confirm">
                  <span>Dismiss this report?</span>
                  <button
                    disabled={saving}
                    onClick={() => void review("DISMISSED")}
                    type="button"
                  >
                    Confirm dismiss
                  </button>
                  <button
                    disabled={saving}
                    onClick={() => setConfirmDismiss(false)}
                    type="button"
                  >
                    Cancel
                  </button>
                </div>
              ) : (
                <button
                  className="dismiss-button"
                  disabled={saving}
                  onClick={() => setConfirmDismiss(true)}
                  type="button"
                >
                  <CircleX size={15} /> Dismiss
                </button>
              )}
            </div>
          </section>
        </div>
      )}
    </article>
  );
}

function statusLabel(value: string) {
  return value
    .toLowerCase()
    .replace(/_/g, " ")
    .replace(/^\w/, (letter) => letter.toUpperCase());
}
function categoryLabel(value: string) {
  return value
    .toLowerCase()
    .replace(/_/g, " ")
    .replace(/^\w/, (letter) => letter.toUpperCase());
}
function formatDate(value: string) {
  return new Date(value).toLocaleString("en-PH", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}
