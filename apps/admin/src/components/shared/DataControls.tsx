import type { ReactNode } from "react";

type DataToolbarProps = {
  search: string;
  onSearch: (value: string) => void;
  searchLabel: string;
  filter?: string;
  onFilter?: (value: string) => void;
  filterLabel?: string;
  options?: { value: string; label: string }[];
  resultCount?: number;
  additionalFilter?: ReactNode;
};

export function DataToolbar({
  search,
  onSearch,
  searchLabel,
  filter = "",
  onFilter,
  filterLabel = "Filter",
  options = [],
  resultCount,
  additionalFilter,
}: DataToolbarProps) {
  return (
    <div className="data-toolbar">
      <label className="data-search">
        <span aria-hidden="true">⌕</span>
        <input
          aria-label={searchLabel}
          onChange={(event) => onSearch(event.target.value)}
          placeholder={searchLabel}
          type="search"
          value={search}
        />
      </label>
      {additionalFilter}
      {onFilter && (
        <label className="data-filter">
          <span>{filterLabel}</span>
          <select
            onChange={(event) => onFilter(event.target.value)}
            value={filter}
          >
            {options.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
      )}
      {resultCount !== undefined && (
        <span className="result-count">
          {resultCount} {resultCount === 1 ? "record" : "records"}
        </span>
      )}
    </div>
  );
}

export function Pagination({
  page,
  pageSize,
  total,
  onPageChange,
}: {
  page: number;
  pageSize: number;
  total: number;
  onPageChange: (page: number) => void;
}) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const start = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const end = Math.min(page * pageSize, total);
  return (
    <nav className="pagination" aria-label="Table pagination">
      <span>
        Showing {start}–{end} of {total}
      </span>
      <div>
        <button
          disabled={page <= 1}
          onClick={() => onPageChange(page - 1)}
          type="button"
        >
          Previous
        </button>
        <span>
          Page {page} of {totalPages}
        </span>
        <button
          disabled={page >= totalPages}
          onClick={() => onPageChange(page + 1)}
          type="button"
        >
          Next
        </button>
      </div>
    </nav>
  );
}
