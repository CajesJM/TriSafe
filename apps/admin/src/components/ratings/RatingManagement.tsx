import { useEffect, useMemo, useState, type ReactNode } from "react";
import { Eye, EyeOff, MessageSquareText, Star, UsersRound } from "lucide-react";
import { api, DriverRating, DriverRatingSummary } from "../../api";
import { DataToolbar } from "../shared/DataControls";
import { EmptyState } from "../shared/Feedback";
import { ModalShell } from "../shared/ModalShell";

export function RatingManagement({
  onNotify,
}: {
  onNotify: (type: "success" | "error" | "info", message: string) => void;
}) {
  const [summaries, setSummaries] = useState<DriverRatingSummary[]>([]);
  const [ratings, setRatings] = useState<DriverRating[]>([]);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("");
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<DriverRating | null>(null);
  async function load() {
    setLoading(true);
    try {
      const [nextSummaries, nextRatings] = await Promise.all([
        api.ratingSummaries(),
        api.ratings(),
      ]);
      setSummaries(nextSummaries);
      setRatings(nextRatings);
    } catch (error) {
      onNotify(
        "error",
        error instanceof Error
          ? error.message
          : "Unable to load driver ratings.",
      );
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => {
    void load();
  }, []);
  const filtered = useMemo(
    () =>
      ratings.filter((rating) => {
        const text =
          `${rating.driver.user.fullName} ${rating.passenger.fullName} ${rating.comment ?? ""} ${rating.driver.vehicles[0]?.plateNumber ?? ""}`.toLowerCase();
        return (
          (!search || text.includes(search.toLowerCase())) &&
          (!filter || (filter === "VISIBLE" ? rating.visible : !rating.visible))
        );
      }),
    [ratings, search, filter],
  );
  const total = summaries.reduce((sum, item) => sum + item.ratingCount, 0);
  const average = total
    ? (
        summaries.reduce(
          (sum, item) => sum + (item.average ?? 0) * item.ratingCount,
          0,
        ) / total
      ).toFixed(2)
    : "—";
  return (
    <div className="rating-workspace">
      <section className="rating-summary">
        <RatingMetric
          icon={<Star />}
          label="Visible average"
          value={average}
          detail="Across all visible ratings"
        />
        <RatingMetric
          icon={<UsersRound />}
          label="Rated drivers"
          value={summaries.filter((item) => item.ratingCount > 0).length}
          detail="With passenger feedback"
        />
        <RatingMetric
          icon={<MessageSquareText />}
          label="Rating records"
          value={total}
          detail="Ride-linked submissions"
        />
      </section>
      <section className="card data-card">
        <div className="section-heading">
          <div>
            <span className="eyebrow">BPLO SAFETY & COMPLIANCE</span>
            <h3>Driver Rating Management</h3>
            <p className="section-description">
              Review ride-linked passenger feedback. A hidden rating remains
              retained for audit purposes and requires an Administrator reason.
            </p>
          </div>
        </div>
        {loading ? (
          <div className="rating-loading">Loading driver rating records…</div>
        ) : (
          <>
            <div className="driver-rating-cards">
              {summaries
                .filter((item) => item.ratingCount > 0)
                .map((item) => (
                  <article key={item.driverId}>
                    <span>{stars(item.average)}</span>
                    <strong>{item.fullName}</strong>
                    <small>
                      {item.vehicle?.plateNumber ?? "No vehicle"} ·{" "}
                      {item.ratingCount} rating
                      {item.ratingCount === 1 ? "" : "s"}
                    </small>
                    <b>{item.average?.toFixed(2)}/5</b>
                  </article>
                ))}
            </div>
            <DataToolbar
              search={search}
              onSearch={setSearch}
              searchLabel="Search driver, passenger, plate, or feedback"
              filter={filter}
              onFilter={setFilter}
              filterLabel="Visibility"
              options={[
                { value: "", label: "All ratings" },
                { value: "VISIBLE", label: "Visible" },
                { value: "HIDDEN", label: "Hidden" },
              ]}
              resultCount={filtered.length}
            />
            {filtered.length ? (
              <div className="rating-list">
                {filtered.map((rating) => (
                  <article className="rating-row" key={rating.id}>
                    <span className="rating-score">
                      {rating.score}
                      <Star />
                    </span>
                    <div>
                      <strong>{rating.driver.user.fullName}</strong>
                      <small>
                        {rating.passenger.fullName} ·{" "}
                        {rating.driver.vehicles[0]?.plateNumber ?? "No plate"} ·{" "}
                        {new Date(rating.createdAt).toLocaleDateString("en-PH")}
                      </small>
                      <p>{rating.comment || "No written feedback."}</p>
                    </div>
                    <span
                      className={`status ${rating.visible ? "verified" : "dismissed"}`}
                    >
                      {rating.visible ? "VISIBLE" : "HIDDEN"}
                    </span>
                    <button
                      className="row-action"
                      type="button"
                      onClick={() => setSelected(rating)}
                    >
                      {rating.visible ? <EyeOff /> : <Eye />} Manage
                    </button>
                  </article>
                ))}
              </div>
            ) : (
              <EmptyState
                title="No matching ratings"
                text="Completed rides will appear here when a passenger submits a rating."
              />
            )}
          </>
        )}
      </section>
      {selected && (
        <RatingModerationModal
          rating={selected}
          onClose={() => setSelected(null)}
          onSaved={async (message) => {
            await load();
            onNotify("success", message);
            setSelected(null);
          }}
          onError={(message) => onNotify("error", message)}
        />
      )}
    </div>
  );
}
function RatingMetric({
  icon,
  label,
  value,
  detail,
}: {
  icon: ReactNode;
  label: string;
  value: string | number;
  detail: string;
}) {
  return (
    <div className="rating-metric">
      <span>{icon}</span>
      <div>
        <small>{label}</small>
        <strong>{value}</strong>
        <em>{detail}</em>
      </div>
    </div>
  );
}
function RatingModerationModal({
  rating,
  onClose,
  onSaved,
  onError,
}: {
  rating: DriverRating;
  onClose: () => void;
  onSaved: (message: string) => Promise<void>;
  onError: (message: string) => void;
}) {
  const [visible, setVisible] = useState(rating.visible);
  const [notes, setNotes] = useState(rating.moderationNotes ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  async function save() {
    if (!visible && !notes.trim()) {
      setError("Enter the administrative reason for hiding this rating.");
      return;
    }
    setSaving(true);
    try {
      await api.moderateRating(rating.id, {
        visible,
        moderationNotes: notes.trim() || undefined,
      });
      await onSaved(
        visible
          ? "Rating was restored to driver statistics."
          : "Rating was hidden from driver statistics and retained for audit.",
      );
    } catch (reason) {
      const message =
        reason instanceof Error
          ? reason.message
          : "Unable to update rating visibility.";
      setError(message);
      onError(message);
    } finally {
      setSaving(false);
    }
  }
  return (
    <ModalShell
      eyebrow="RATING MODERATION"
      title="Manage rating visibility"
      description="Ratings are never deleted through this screen. Hidden records remain available to authorized LGU Administrators and in the audit trail."
      onClose={onClose}
      busy={saving}
      size="medium"
      footer={
        <>
          <button className="secondary" type="button" onClick={onClose}>
            Cancel
          </button>
          <button
            className="primary"
            type="button"
            disabled={saving}
            onClick={() => void save()}
          >
            {saving ? "Saving…" : "Save decision"}
          </button>
        </>
      }
    >
      <div className="rating-moderation">
        <p>
          <b>{rating.driver.user.fullName}</b> received{" "}
          <strong>{rating.score}/5</strong> from {rating.passenger.fullName}.
        </p>
        <label className="rating-visibility">
          <input
            type="checkbox"
            checked={visible}
            onChange={(event) => setVisible(event.target.checked)}
          />{" "}
          Include this rating in driver statistics
        </label>
        <label className="field">
          <span>Administrative reason {!visible && <em>*</em>}</span>
          <textarea
            rows={4}
            value={notes}
            onChange={(event) => setNotes(event.target.value)}
            placeholder="Explain why this rating is being hidden or restored."
          />
        </label>
        {error && (
          <div className="error" role="alert">
            {error}
          </div>
        )}
      </div>
    </ModalShell>
  );
}
function stars(value: number | null) {
  return value
    ? "★".repeat(Math.round(value)) + "☆".repeat(5 - Math.round(value))
    : "No ratings";
}
