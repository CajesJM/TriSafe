import { useState } from "react";
import {
  CarFront,
  CheckCircle2,
  CircleX,
  Clock3,
  FileText,
  LoaderCircle,
  Star,
} from "lucide-react";
import { Incident, IncidentReviewInput } from "../../api";
import type { ToastMessage } from "../shared/ToastNotification";

export function IncidentReviewCard({
  incident,
  searchQuery,
  onReview,
  onNotify,
}: {
  incident: Incident;
  searchQuery: string;
  onReview: (id: string, review: IncidentReviewInput) => Promise<void>;
  onNotify: (type: ToastMessage["type"], message: string) => void;
}) {
  const category = incident.category;
  const notes = incident.reviewerNotes ?? "";
  const driverRatings = incident.ride?.vehicle.driver.ratings ?? [];
  const driverRating = driverRatings.length
    ? driverRatings.reduce((total, rating) => total + rating.score, 0) /
      driverRatings.length
    : 0;
  const [saving, setSaving] = useState(false);
  const [confirmDismiss, setConfirmDismiss] = useState(false);

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
    <article className="incident-review-card">
      <header className="incident-card-header">
        <div className="incident-card-title">
          <div className="incident-card-badges">
            <span className="incident-id-badge">
              <HighlightText
                text={formatIncidentId(incident.id)}
                query={searchQuery}
              />
            </span>
            <span
              className={`incident-review-status ${incident.status.toLowerCase()}`}
            >
              {outcomeLabel(incident.status)}
            </span>
          </div>
          <h4>
            <HighlightText
              text={incident.passenger.fullName}
              query={searchQuery}
            />
          </h4>
          <div className="incident-submitter">
            <span className="incident-passenger-avatar">
              {incident.passenger.avatarData ? (
                <img src={incident.passenger.avatarData} alt="" />
              ) : (
                initials(incident.passenger.fullName)
              )}
            </span>
            <div>
              <b>
                {incident.passenger.username
                  ? `@${incident.passenger.username}`
                  : "Passenger account"}
              </b>
              <small>
                Submitted {formatDate(incident.createdAt)}
                {incident.passenger.phone
                  ? ` · ${incident.passenger.phone}`
                  : ""}
              </small>
            </div>
          </div>
        </div>
        <FileText className="incident-record-mark" aria-hidden="true" />
      </header>

      <div className="incident-card-summary">
        <section className="incident-description-block">
          <div>
            <span>DESCRIPTION</span>
            <small>
              <HighlightText
                text={categoryLabel(incident.category)}
                query={searchQuery}
              />
            </small>
          </div>
          <p>
            <HighlightText
              text={incident.rawDescription}
              query={searchQuery}
            />
          </p>
        </section>
      </div>

      <div className="incident-card-body">
        {incident.ride ? (
          <section
            className="incident-ride-context"
            aria-label="Related ride information"
          >
            <div className="incident-driver-identity">
              <b className="incident-driver-name">
                <HighlightText
                  text={incident.ride.vehicle.driver.user.fullName}
                  query={searchQuery}
                />
              </b>
              <div className="incident-driver-meta">
                <span className="incident-driver-avatar">
                  {incident.ride.vehicle.driver.user.avatarData ? (
                    <img
                      src={incident.ride.vehicle.driver.user.avatarData}
                      alt={`${incident.ride.vehicle.driver.user.fullName} profile`}
                    />
                  ) : (
                    initials(incident.ride.vehicle.driver.user.fullName)
                  )}
                </span>
                <span>
                  <strong>
                    {unitLabel(incident.ride.vehicle.vehicleType)}{" "}
                    <HighlightText
                      text={unitNumber(incident.ride.vehicle)}
                      query={searchQuery}
                    />
                  </strong>
                </span>
              </div>
              <div
                className="incident-driver-rating"
                style={{ color: ratingColor(driverRating) }}
                aria-label={
                  driverRatings.length
                    ? `${driverRating.toFixed(1)} out of 5`
                    : "No driver ratings yet"
                }
              >
                <span className="incident-rating-stars" aria-hidden="true">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <span className="incident-rating-star" key={star}>
                      <Star className="incident-rating-star-empty" />
                      <span
                        className="incident-rating-star-fill"
                        style={{
                          width: `${Math.max(0, Math.min(1, driverRating - (star - 1))) * 100}%`,
                        }}
                      >
                        <Star fill="currentColor" />
                      </span>
                    </span>
                  ))}
                </span>
                <small>
                  {driverRatings.length
                    ? driverRating.toFixed(1)
                    : "No ratings yet"}
                </small>
                <span className="incident-driver-detail-separator">–</span>
                <small>{vehicleTypeLabel(incident.ride.vehicle.vehicleType)}</small>
                <span className="incident-driver-detail-separator">–</span>
                <small>
                  Franchise {incident.ride.vehicle.driver.franchise?.franchiseNumber ?? "not assigned"}
                </small>
                <span className="incident-driver-detail-separator">–</span>
                <small>
                  PHP {Number(incident.ride.estimatedFare).toFixed(2)} estimated fare
                </small>
              </div>
            </div>
          </section>
        ) : (
          <div className="incident-no-ride">
            <CarFront size={16} /> This report is not linked to a recorded ride.
          </div>
        )}
      </div>

      <footer className="incident-card-actions">
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
      </footer>
    </article>
  );
}

function formatIncidentId(value: string) {
  return /^INCR-[A-Z0-9]{5}$/i.test(value)
    ? value.toUpperCase()
    : `#${value.slice(-8).toUpperCase()}`;
}
function outcomeLabel(value: string) {
  if (value === "UNDER_REVIEW") return "Review in progress";
  if (value === "RESOLVED") return "Incident resolved";
  if (value === "DISMISSED") return "Report dismissed";
  return "Review outcome pending";
}
function initials(value: string) {
  return value
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
}
function categoryLabel(value: string) {
  return value
    .toLowerCase()
    .replace(/_/g, " ")
    .replace(/^\w/, (letter) => letter.toUpperCase());
}
function unitNumber(vehicle: {
  vehicleType: string;
  bodyNumber?: string | null;
  permitNumber?: string | null;
}) {
  return vehicle.vehicleType === "HABAL_HABAL"
    ? (vehicle.permitNumber ?? "Not assigned")
    : (vehicle.bodyNumber ?? "Not assigned");
}
function unitLabel(vehicleType: string) {
  return vehicleType === "HABAL_HABAL" ? "Permit no." : "Body no.";
}
function vehicleTypeLabel(value: string) {
  return value
    .toLowerCase()
    .replace(/_/g, "-")
    .replace(/^\w/, (letter) => letter.toUpperCase());
}
function ratingColor(rating: number) {
  if (rating >= 4) return "#e6a008";
  if (rating >= 3) return "#d78b16";
  if (rating > 0) return "#d05a45";
  return "#aab4ad";
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
function HighlightText({ text, query }: { text: string; query: string }) {
  const terms = Array.from(
    new Set(query.trim().split(/\s+/).filter(Boolean)),
  ).sort((left, right) => right.length - left.length);
  if (terms.length === 0) return text;
  const escapedTerms = terms.map((term) =>
    term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"),
  );
  const parts = text.split(new RegExp(`(${escapedTerms.join("|")})`, "gi"));
  return (
    <>
      {parts.map((part, index) =>
        terms.some((term) => term.toLowerCase() === part.toLowerCase()) ? (
          <mark className="incident-search-highlight" key={`${part}-${index}`}>
            {part}
          </mark>
        ) : (
          part
        ),
      )}
    </>
  );
}
