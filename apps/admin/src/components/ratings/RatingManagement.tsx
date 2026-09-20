import { memo, useEffect, useId, useMemo, useRef, useState } from "react";
import {
  ArrowDownUp,
  CalendarDays,
  Check,
  ChevronDown,
  Info,
  MessageSquareText,
  SlidersHorizontal,
  Star,
  ThumbsUp,
  Trophy,
  UsersRound,
} from "lucide-react";
import { api, DriverFeedback, DriverRatingSummary } from "../../api";
import { ConfirmModal } from "../shared/ConfirmModal";
import { ModalShell } from "../shared/ModalShell";

type RatingSort = "default" | "name-asc" | "name-desc" | "newest" | "oldest";
const SORT_OPTIONS: { value: Exclude<RatingSort, "default">; label: string }[] =
  [
    { value: "name-asc", label: "Name A–Z" },
    { value: "name-desc", label: "Name Z–A" },
    { value: "newest", label: "Newest registered" },
    { value: "oldest", label: "Oldest registered" },
  ];

export function RatingManagement({
  onNotify,
}: {
  onNotify: (type: "success" | "error" | "info", message: string) => void;
}) {
  const [summaries, setSummaries] = useState<DriverRatingSummary[]>([]);
  const [selectedDriver, setSelectedDriver] =
    useState<DriverRatingSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [rankingOpen, setRankingOpen] = useState(false);
  const [sortMode, setSortMode] = useState<RatingSort>("default");
  const [sortOpen, setSortOpen] = useState(false);
  const sortControlRef = useRef<HTMLDivElement>(null);
  const sortButtonRef = useRef<HTMLButtonElement>(null);
  const sortMenuId = useId();
  useEffect(() => {
    if (!sortOpen) return;
    function handlePointerDown(event: PointerEvent) {
      if (!sortControlRef.current?.contains(event.target as Node))
        setSortOpen(false);
    }
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setSortOpen(false);
        sortButtonRef.current?.focus();
      }
    }
    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [sortOpen]);
  async function load() {
    setLoading(true);
    try {
      const nextSummaries = await api.ratingSummaries();
      setSummaries(nextSummaries);
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
  const uniqueSummaries = Array.from(
    new Map(summaries.map((summary) => [summary.driverId, summary])).values(),
  );
  const displayedDrivers =
    sortMode === "default"
      ? uniqueSummaries
      : [...uniqueSummaries].sort((left, right) => {
          if (sortMode === "name-asc")
            return left.fullName.localeCompare(right.fullName);
          if (sortMode === "name-desc")
            return right.fullName.localeCompare(left.fullName);
          const dateDifference =
            Date.parse(left.createdAt) - Date.parse(right.createdAt);
          return (
            (sortMode === "newest" ? -dateDifference : dateDifference) ||
            left.fullName.localeCompare(right.fullName)
          );
        });
  return (
    <div className="rating-workspace">
      <section className="card data-card">
        <div className="section-heading">
          <div>
            <span className="eyebrow">BPLO SAFETY & COMPLIANCE</span>
            <h3>Driver Rating Management</h3>
            <p className="section-description">
              Review ride-linked passenger feedback and driver rating records.
            </p>
          </div>
          <div className="rating-list-controls">
            <button
              className="rating-ranking-toggle"
              type="button"
              onClick={() => setRankingOpen(true)}
              disabled={loading}
            >
              <Trophy aria-hidden="true" />
              Show ranking
            </button>
            <div className="rating-sort-control" ref={sortControlRef}>
              <button
                ref={sortButtonRef}
                className="rating-list-control"
                type="button"
                aria-expanded={sortOpen}
                aria-controls={sortMenuId}
                onClick={() => setSortOpen((current) => !current)}
                disabled={loading}
              >
                <ArrowDownUp aria-hidden="true" />
                {sortMode === "default"
                  ? "Sort list"
                  : SORT_OPTIONS.find((option) => option.value === sortMode)
                      ?.label}
                <ChevronDown
                  className="rating-sort-chevron"
                  aria-hidden="true"
                />
              </button>
              {sortOpen && (
                <div
                  className="rating-sort-menu"
                  id={sortMenuId}
                  aria-label="Sort drivers"
                >
                  {SORT_OPTIONS.map((option) => (
                    <button
                      key={option.value}
                      type="button"
                      aria-pressed={sortMode === option.value}
                      onClick={() => {
                        setSortMode(option.value);
                        setSortOpen(false);
                      }}
                    >
                      {option.label}
                      {sortMode === option.value && (
                        <Check aria-hidden="true" />
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>
            <button
              className="rating-list-control rating-view-reset"
              type="button"
              title="Reset sorting to default"
              aria-label="Reset driver ratings sorting to default"
              onClick={() => {
                setSortMode("default");
                setSortOpen(false);
              }}
              disabled={loading || sortMode === "default"}
            >
              <SlidersHorizontal aria-hidden="true" />
            </button>
          </div>
        </div>
        {loading ? (
          <div className="rating-loading">Loading driver rating records…</div>
        ) : (
          <div className="driver-rating-cards">
            {displayedDrivers.map((item) => (
              <DriverRatingCard
                key={item.driverId}
                driver={item}
                onView={setSelectedDriver}
              />
            ))}
          </div>
        )}
      </section>
      {rankingOpen && (
        <DriverRankingModal
          drivers={uniqueSummaries}
          onClose={() => setRankingOpen(false)}
        />
      )}
      {selectedDriver && (
        <DriverRatingsModal
          key={selectedDriver.driverId}
          driver={selectedDriver}
          onClose={() => setSelectedDriver(null)}
          onReset={(driverId) =>
            setSummaries((current) =>
              current.map((summary) =>
                summary.driverId === driverId
                  ? { ...summary, average: null, ratingCount: 0 }
                  : summary,
              ),
            )
          }
          onNotify={onNotify}
        />
      )}
    </div>
  );
}
const DriverRatingCard = memo(function DriverRatingCard({
  driver,
  onView,
}: {
  driver: DriverRatingSummary;
  onView: (driver: DriverRatingSummary) => void;
}) {
  return (
    <article className="driver-rating-card">
      <div className="driver-rating-card-header">
        <div className="rating-driver-profile">
          <ProfileAvatar
            name={driver.fullName}
            avatarData={driver.avatarData}
          />
          <div>
            <strong>{driver.fullName}</strong>
            <small>
              {driver.username ? `@${driver.username}` : "Registered driver"}
            </small>
          </div>
        </div>
        <button
          className="driver-rating-view"
          type="button"
          onClick={() => onView(driver)}
        >
          View
        </button>
      </div>
      <div className="driver-rating-value">
        <RatingStars value={driver.average ?? 0} />
        <b>{driver.average?.toFixed(1) ?? "No ratings yet"}</b>
      </div>
      <small className="driver-rating-details">
        {unitDetails(driver.vehicle)} ·{" "}
        {driver.vehicle?.plateNumber ?? "No vehicle"} · {driver.ratingCount}{" "}
        feedback {driver.ratingCount === 1 ? "record" : "records"}
      </small>
    </article>
  );
});
function DriverRankingModal({
  drivers,
  onClose,
}: {
  drivers: DriverRatingSummary[];
  onClose: () => void;
}) {
  const rankedDrivers = drivers
    .filter((driver) => driver.ratingCount > 0)
    .sort(
      (left, right) =>
        (right.average ?? 0) - (left.average ?? 0) ||
        right.ratingCount - left.ratingCount ||
        left.fullName.localeCompare(right.fullName),
    );
  const unratedDrivers = drivers.filter((driver) => driver.ratingCount === 0);

  return (
    <ModalShell
      eyebrow="DRIVER RATINGS"
      title="Driver ranking"
      description="Ordered by average passenger rating; ties are decided by the number of ratings."
      onClose={onClose}
      className="driver-ranking-modal"
      backdropClassName="rating-modal-backdrop"
    >
      {rankedDrivers.length ? (
        <ol className="driver-ranking-list">
          {rankedDrivers.map((driver, index) => (
            <li key={driver.driverId} className="driver-ranking-row">
              <span className="driver-ranking-place">#{index + 1}</span>
              <ProfileAvatar
                name={driver.fullName}
                avatarData={driver.avatarData}
              />
              <div className="driver-ranking-name">
                <strong>{driver.fullName}</strong>
                <small>
                  {driver.ratingCount} passenger{" "}
                  {driver.ratingCount === 1 ? "rating" : "ratings"}
                </small>
              </div>
              <div className="driver-ranking-score">
                <RatingStars value={driver.average ?? 0} />
                <strong>{driver.average?.toFixed(2)}</strong>
              </div>
            </li>
          ))}
        </ol>
      ) : (
        <p className="driver-ranking-empty">
          No driver has received a passenger rating yet.
        </p>
      )}
      {unratedDrivers.length > 0 && (
        <section
          className="driver-ranking-unrated"
          aria-label="Drivers awaiting a first rating"
        >
          <h3>Awaiting first rating</h3>
          <ul className="driver-ranking-list">
            {unratedDrivers.map((driver) => (
              <li key={driver.driverId} className="driver-ranking-row">
                <span className="driver-ranking-place is-unrated">—</span>
                <ProfileAvatar
                  name={driver.fullName}
                  avatarData={driver.avatarData}
                />
                <div className="driver-ranking-name">
                  <strong>{driver.fullName}</strong>
                  <small>No ratings yet</small>
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}
    </ModalShell>
  );
}
function RatingStars({ value }: { value: number }) {
  return (
    <span className="rating-stars" aria-label={`${value.toFixed(1)} out of 5`}>
      {[1, 2, 3, 4, 5].map((star) => (
        <span className="rating-star" key={star} aria-hidden="true">
          <Star className="rating-star-empty" />
          <span
            className="rating-star-fill"
            style={{
              width: `${Math.max(0, Math.min(1, value - (star - 1))) * 100}%`,
            }}
          >
            <Star fill="currentColor" />
          </span>
        </span>
      ))}
    </span>
  );
}
function DriverRatingsModal({
  driver,
  onClose,
  onReset,
  onNotify,
}: {
  driver: DriverRatingSummary;
  onClose: () => void;
  onReset: (driverId: string) => void;
  onNotify: (type: "success" | "error" | "info", message: string) => void;
}) {
  const [ratings, setRatings] = useState<DriverFeedback[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [page, setPage] = useState(1);
  const [confirmingReset, setConfirmingReset] = useState(false);
  const listRef = useRef<HTMLDivElement>(null);
  const pageSize = 10;

  useEffect(() => {
    let active = true;
    void api.driverRatings(driver.driverId).then(
      (records) => {
        if (!active) return;
        setRatings(records);
        setLoading(false);
      },
      (reason: unknown) => {
        if (!active) return;
        setError(
          reason instanceof Error
            ? reason.message
            : "Unable to load passenger ratings.",
        );
        setLoading(false);
      },
    );
    return () => {
      active = false;
    };
  }, [driver.driverId]);

  const sortedRatings = useMemo(
    () =>
      [...ratings].sort(
        (left, right) =>
          new Date(right.createdAt).getTime() -
          new Date(left.createdAt).getTime(),
      ),
    [ratings],
  );
  const {
    ratingCount,
    average,
    positivePercent,
    fiveStarRatings,
    writtenFeedback,
    ratingCounts,
  } = useMemo(() => {
    const counts = [0, 0, 0, 0, 0, 0];
    let scoreTotal = 0;
    let positive = 0;
    let written = 0;
    for (const rating of ratings) {
      counts[rating.score] += 1;
      scoreTotal += rating.score;
      if (rating.score >= 4) positive += 1;
      if (rating.comment?.trim()) written += 1;
    }
    const count = ratings.length;
    return {
      ratingCount: count,
      average: count ? scoreTotal / count : 0,
      positivePercent: count ? Math.round((positive / count) * 100) : 0,
      fiveStarRatings: counts[5],
      writtenFeedback: written,
      ratingCounts: counts,
    };
  }, [ratings]);
  const pageCount = Math.ceil(sortedRatings.length / pageSize);
  const pageRatings = sortedRatings.slice(
    (page - 1) * pageSize,
    page * pageSize,
  );
  const rangeStart = (page - 1) * pageSize + 1;
  const rangeEnd = Math.min(page * pageSize, ratingCount);
  const displayedAverage = loading || error ? driver.average : average;
  const latestRating = sortedRatings[0];

  function changePage(nextPage: number) {
    setPage(nextPage);
    listRef.current?.scrollIntoView({ block: "start" });
  }

  return (
    <>
      <ModalShell
        eyebrow="DRIVER RATINGS"
        title={`${driver.fullName}'s feedback`}
        description="Passenger ratings and feedback from completed rides."
        onClose={onClose}
        size="large"
        className="driver-ratings-modal"
        backdropClassName="rating-modal-backdrop"
        headerAction={<RatingInfoButton />}
        busy={confirmingReset}
      >
        <div className="rating-view-layout">
          <aside
            className="rating-view-sidebar"
            aria-label="Driver rating summary"
          >
            <div className="rating-view-driver">
              <div className="rating-view-driver-avatar">
                <ProfileAvatar
                  name={driver.fullName}
                  avatarData={driver.avatarData}
                />
                <span
                  className="rating-view-driver-check"
                  aria-label="Registered driver"
                >
                  <Check aria-hidden="true" />
                </span>
              </div>
              <strong>{driver.fullName}</strong>
              <span>
                {unitDetails(driver.vehicle)} ·{" "}
                {driver.vehicle?.plateNumber ?? "No vehicle"}
              </span>
            </div>
            <div className="rating-view-average">
              <span>Average rating</span>
              <div className="driver-rating-value">
                <b>{displayedAverage?.toFixed(1) ?? "—"}</b>
                <RatingStars value={displayedAverage ?? 0} />
              </div>
            </div>
            <div className="rating-view-stat">
              <UsersRound aria-hidden="true" />
              <div>
                <span>Passenger ratings</span>
                <strong>{ratingCount}</strong>
              </div>
            </div>
            <div className="rating-view-stat">
              <ThumbsUp aria-hidden="true" />
              <div>
                <span>Positive ratings</span>
                <strong>{positivePercent}%</strong>
              </div>
            </div>
            <p className="rating-view-motto">
              Safe drivers.
              <br />
              Safer communities.
            </p>
          </aside>
          <div className="rating-view-content">
            {loading ? (
              <div className="rating-loading" role="status">
                Loading passenger feedback…
              </div>
            ) : error ? (
              <p className="rating-view-error" role="alert">
                {error}
              </p>
            ) : (
              <>
                <div className="rating-view-overview">
                  <section
                    className="rating-view-insights"
                    aria-label="Feedback statistics"
                  >
                    <h3>Feedback stats</h3>
                    <div className="rating-view-insight">
                      <Star aria-hidden="true" />
                      <span>Five-star ratings</span>
                      <strong>{fiveStarRatings}</strong>
                    </div>
                    <div className="rating-view-insight">
                      <MessageSquareText aria-hidden="true" />
                      <span>Written feedback</span>
                      <strong>{writtenFeedback}</strong>
                    </div>
                    <div className="rating-view-insight">
                      <CalendarDays aria-hidden="true" />
                      <span>Latest rating</span>
                      <strong>
                        {latestRating
                          ? formatRatingDate(latestRating.createdAt)
                          : "—"}
                      </strong>
                    </div>
                  </section>
                  <section
                    className="rating-distribution"
                    aria-label="Rating breakdown"
                  >
                    <div className="rating-distribution-heading">
                      <h3>Rating breakdown</h3>
                      <span>
                        {ratingCount} total{" "}
                        {ratingCount === 1 ? "rating" : "ratings"}
                      </span>
                    </div>
                    {[5, 4, 3, 2, 1].map((score) => {
                      const count = ratingCounts[score];
                      return (
                        <div className="rating-distribution-row" key={score}>
                          <span>
                            {score} <Star aria-hidden="true" />
                          </span>
                          <span
                            className="rating-distribution-track"
                            aria-hidden="true"
                          >
                            <span
                              style={{
                                width: `${ratingCount ? (count / ratingCount) * 100 : 0}%`,
                              }}
                            />
                          </span>
                          <b>
                            {count}{" "}
                            <span>
                              (
                              {ratingCount
                                ? Math.round((count / ratingCount) * 100)
                                : 0}
                              %)
                            </span>
                          </b>
                        </div>
                      );
                    })}
                  </section>
                </div>
                <div
                  className="rating-view-list"
                  ref={listRef}
                  aria-label="Passenger feedback, newest first"
                >
                  {pageRatings.length === 0 && (
                    <p className="rating-view-empty">
                      No passenger feedback yet.
                    </p>
                  )}
                  {pageRatings.map((rating) => (
                    <article className="rating-view-item" key={rating.id}>
                      <header>
                        <div className="rating-passenger-identity">
                          <ProfileAvatar
                            name={rating.passenger.fullName}
                            avatarData={rating.passenger.avatarData}
                            compact
                          />
                          <div>
                            <strong>{rating.passenger.fullName}</strong>
                            <small>
                              {rating.passenger.username
                                ? `@${rating.passenger.username} · `
                                : ""}
                              {formatRatingDate(rating.createdAt)}
                            </small>
                          </div>
                        </div>
                        <div className="rating-view-score">
                          <RatingStars value={rating.score} />
                          <b>{rating.score.toFixed(1)}</b>
                        </div>
                      </header>
                      <div
                        className={`rating-view-comment${rating.comment ? "" : " is-empty"}`}
                      >
                        {rating.comment || (
                          <>
                            <MessageSquareText aria-hidden="true" />
                            <span>No written feedback provided.</span>
                          </>
                        )}
                      </div>
                    </article>
                  ))}
                </div>
                {pageCount > 1 && (
                  <nav
                    className="rating-view-pagination"
                    aria-label="Feedback pages"
                  >
                    <button
                      type="button"
                      disabled={page === 1}
                      onClick={() => changePage(page - 1)}
                    >
                      Previous
                    </button>
                    <span aria-live="polite">
                      {rangeStart}–{rangeEnd} of {ratingCount} · Page {page} of{" "}
                      {pageCount}
                    </span>
                    <button
                      type="button"
                      disabled={page === pageCount}
                      onClick={() => changePage(page + 1)}
                    >
                      Next
                    </button>
                  </nav>
                )}
              </>
            )}
            <div className="rating-view-footer">
              <button
                className="rating-view-reset"
                type="button"
                disabled={loading || Boolean(error) || ratingCount === 0}
                onClick={() => setConfirmingReset(true)}
              >
                Reset ratings
              </button>
            </div>
          </div>
        </div>
      </ModalShell>
      {confirmingReset && (
        <ConfirmModal
          title={`Reset ${driver.fullName}'s ratings?`}
          backdropClassName="rating-reset-backdrop"
          message={`This permanently deletes ${ratingCount} passenger ${ratingCount === 1 ? "rating" : "ratings"} and any written feedback for this driver. Completed ride records remain unchanged. This cannot be undone.`}
          confirmLabel="Reset ratings"
          confirmationText="RESET"
          tone="danger"
          onCancel={() => setConfirmingReset(false)}
          onConfirm={async () => {
            const result = await api.resetDriverRatings(
              driver.driverId,
              "RESET",
            );
            setRatings([]);
            setPage(1);
            onReset(driver.driverId);
            onNotify(
              "success",
              `${result.deletedCount} rating ${result.deletedCount === 1 ? "record" : "records"} reset for ${driver.fullName}.`,
            );
          }}
        />
      )}
    </>
  );
}
function RatingInfoButton() {
  const [open, setOpen] = useState(false);
  const [closing, setClosing] = useState(false);
  const control = useRef<HTMLDivElement>(null);
  const informationId = useId();

  useEffect(() => {
    if (!open || closing) return;
    const dismissTimer = window.setTimeout(() => setClosing(true), 8_000);
    function closeOutside(event: PointerEvent) {
      if (!control.current?.contains(event.target as Node)) setClosing(true);
    }
    document.addEventListener("pointerdown", closeOutside);
    return () => {
      window.clearTimeout(dismissTimer);
      document.removeEventListener("pointerdown", closeOutside);
    };
  }, [closing, open]);

  return (
    <div className="rating-info-control" ref={control}>
      <button
        type="button"
        aria-label="How positive ratings are calculated"
        aria-expanded={open && !closing}
        aria-controls={informationId}
        onClick={() => {
          if (open) {
            setClosing(true);
            return;
          }
          setClosing(false);
          setOpen(true);
        }}
      >
        <Info aria-hidden="true" />
      </button>
      {open && (
        <div
          id={informationId}
          className={`rating-info-popover${closing ? " closing" : ""}`}
          role="status"
          onAnimationEnd={() => {
            if (!closing) return;
            setOpen(false);
            setClosing(false);
          }}
        >
          <strong>How positive ratings work</strong>
          <p>
            Ratings of 4 or 5 stars count as positive. The percentage is
            positive ratings divided by all passenger ratings, rounded to the
            nearest whole number. Written feedback does not affect it.
          </p>
        </div>
      )}
    </div>
  );
}
function ProfileAvatar({
  name,
  avatarData,
  compact = false,
}: {
  name: string;
  avatarData?: string | null;
  compact?: boolean;
}) {
  return (
    <span className={`rating-avatar${compact ? " compact" : ""}`}>
      {avatarData ? (
        <img src={avatarData} alt={`${name} profile`} />
      ) : (
        initials(name)
      )}
    </span>
  );
}
function formatRatingDate(value: string) {
  return new Date(value).toLocaleDateString("en-PH", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}
function unitDetails(
  vehicle?: {
    vehicleType: string;
    bodyNumber?: string | null;
    permitNumber?: string | null;
  } | null,
) {
  if (!vehicle) return "No unit assigned";
  return vehicle.vehicleType === "HABAL_HABAL"
    ? `Permit no. ${vehicle.permitNumber ?? "not assigned"}`
    : `Body no. ${vehicle.bodyNumber ?? "not assigned"}`;
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
