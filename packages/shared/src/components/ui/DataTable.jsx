import { useState } from "react";
import { LuArrowDown, LuArrowUp, LuArrowUpDown, LuChevronLeft, LuChevronRight } from "react-icons/lu";
import Button from "./Button";
import cx from "../../utils/cx";
import { orDash } from "../../utils/format";
import styles from "./DataTable.module.css";

// Responsive table: a real <table> from 768px, a card list on phones.
// columns: [{ key, header, render?(row), primary?, hideOnMobile?, nowrap?, sortKey? }]
// The `primary` column becomes the card title on phones.
//
// Paging:  without `pagination`, rows are paged in the browser (pageSize).
//          With `pagination` ({ page, pageSize, total, totalPages }) the rows ARE the
//          current page from the API and `onPageChange(page)` asks for another one.
// Sorting: with `onSort(sortKey)` and `sort` ({ key, order }), columns that have a
//          sortKey get a sort button in their header.
export default function DataTable({
  caption,
  columns,
  rows,
  rowKey = (row) => row.id,
  actions,
  pageSize = 10,
  pagination,
  onPageChange,
  sort,
  onSort
}) {
  const [localPage, setLocalPage] = useState(1);

  const server = Boolean(pagination);
  const size = server ? pagination.pageSize : pageSize;
  const total = server ? pagination.total : rows.length;
  const pageCount = server ? pagination.totalPages : Math.max(1, Math.ceil(rows.length / size));
  const currentPage = server ? pagination.page : Math.min(localPage, pageCount);
  const firstIndex = (currentPage - 1) * size;
  const visibleRows = server ? rows : rows.slice(firstIndex, firstIndex + size);
  const goTo = (page) => (server ? onPageChange(page) : setLocalPage(page));

  const primaryColumn = columns.find((column) => column.primary) || columns[0];
  const cell = (column, row) => (column.render ? column.render(row) : orDash(row[column.key]));

  const header = (column) => {
    if (!onSort || !column.sortKey) return column.header;
    const active = sort?.key === column.sortKey;
    const Icon = !active ? LuArrowUpDown : sort.order === "asc" ? LuArrowUp : LuArrowDown;
    return (
      <button type="button" className={styles.sortButton} onClick={() => onSort(column.sortKey)}>
        {column.header}
        <Icon aria-hidden="true" className={cx(styles.sortIcon, active && styles.sortActive)} />
      </button>
    );
  };

  const ariaSort = (column) => {
    if (!onSort || !column.sortKey) return undefined;
    if (sort?.key !== column.sortKey) return "none";
    return sort.order === "asc" ? "ascending" : "descending";
  };

  return (
    <div className={styles.wrapper}>
      <div className={styles.tableScroll}>
        <table className={styles.table}>
          <caption className="visually-hidden">{caption}</caption>
          <thead>
            <tr>
              {columns.map((column) => (
                <th key={column.key} scope="col" aria-sort={ariaSort(column)}>{header(column)}</th>
              ))}
              {actions && (
                <th scope="col" className={styles.actionsHeader}>
                  <span className="visually-hidden">Actions</span>
                </th>
              )}
            </tr>
          </thead>
          <tbody>
            {visibleRows.map((row) => (
              <tr key={rowKey(row)}>
                {columns.map((column) => (
                  <td key={column.key} className={cx(column.nowrap && styles.nowrap, column.primary && styles.primaryCell)}>
                    {cell(column, row)}
                  </td>
                ))}
                {actions && <td className={styles.actionsCell}>{actions(row)}</td>}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <ul className={styles.cards} aria-label={caption}>
        {visibleRows.map((row) => (
          <li key={rowKey(row)} className={styles.card}>
            <div className={styles.cardTitle}>{cell(primaryColumn, row)}</div>
            <dl className={styles.cardFields}>
              {columns
                .filter((column) => column !== primaryColumn && !column.hideOnMobile)
                .map((column) => (
                  <div key={column.key} className={styles.cardField}>
                    <dt>{column.header}</dt>
                    <dd>{cell(column, row)}</dd>
                  </div>
                ))}
            </dl>
            {actions && <div className={styles.cardActions}>{actions(row)}</div>}
          </li>
        ))}
      </ul>

      {pageCount > 1 && (
        <nav className={styles.pagination} aria-label={`${caption} pages`}>
          <p className={styles.range}>
            Showing <strong>{firstIndex + 1}–{firstIndex + visibleRows.length}</strong> of <strong>{total}</strong>
          </p>
          <div className={styles.pageButtons}>
            <Button
              size="sm"
              variant="secondary"
              leftIcon={<LuChevronLeft />}
              disabled={currentPage === 1}
              onClick={() => goTo(currentPage - 1)}
            >
              Previous
            </Button>
            <span className={styles.pageLabel}>
              Page {currentPage} of {pageCount}
            </span>
            <Button
              size="sm"
              variant="secondary"
              rightIcon={<LuChevronRight />}
              disabled={currentPage === pageCount}
              onClick={() => goTo(currentPage + 1)}
            >
              Next
            </Button>
          </div>
        </nav>
      )}
    </div>
  );
}
