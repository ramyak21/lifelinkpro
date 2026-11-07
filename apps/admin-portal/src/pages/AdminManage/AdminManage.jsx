import { useCallback, useEffect, useState } from "react";
import { Navigate, useParams, useSearchParams } from "react-router-dom";
import { LuArrowRight, LuInbox, LuPencil, LuPlus, LuRefreshCw, LuSearchX, LuTrash2 } from "react-icons/lu";
import PageHeader from "@lifelink/shared/components/ui/PageHeader";
import Badge from "@lifelink/shared/components/ui/Badge";
import Button from "@lifelink/shared/components/ui/Button";
import Toolbar from "@lifelink/shared/components/ui/Toolbar";
import SearchInput from "@lifelink/shared/components/ui/SearchInput";
import SegmentedControl from "@lifelink/shared/components/ui/SegmentedControl";
import DataTable from "@lifelink/shared/components/ui/DataTable";
import ConfirmDialog from "@lifelink/shared/components/ui/ConfirmDialog";
import Drawer from "@lifelink/shared/components/ui/Drawer";
import EmptyState from "@lifelink/shared/components/ui/EmptyState";
import ErrorState from "@lifelink/shared/components/ui/ErrorState";
import { SkeletonTable } from "@lifelink/shared/components/ui/Skeleton";
import RecordForm from "../../components/admin/RecordForm";
import { ADMIN_RESOURCES } from "../../components/admin/adminResources";
import { manageApi } from "@lifelink/shared/services/lifelink";
import { useAsync } from "@lifelink/shared/hooks/useAsync";
import { useAuth } from "@lifelink/shared/hooks/useAuth";
import { useToast } from "@lifelink/shared/hooks/useToast";
import { useDocumentTitle } from "@lifelink/shared/hooks/useDocumentTitle";
import { getErrorMessage } from "@lifelink/shared/utils/errors";
import { pluralize } from "@lifelink/shared/utils/format";
import styles from "./AdminManage.module.css";

const PAGE_SIZE = 25;
const SEARCH_DELAY_MS = 350;
// Newest/latest first when sorting by a date; A→Z for everything else
const DATE_SORTS = ["created_at", "updated_at", "date"];

const capitalize = (text) => text.charAt(0).toUpperCase() + text.slice(1);

// /manage/:resource — one screen per record type (see adminResources.jsx)
export default function AdminManage() {
  const { resource } = useParams();
  const config = ADMIN_RESOURCES[resource];

  if (!config) {
    return <Navigate to="/" replace />;
  }

  // key: switching resources starts with fresh dialogs and search box
  return <ResourceManager key={resource} resource={resource} config={config} />;
}

function ResourceManager({ resource, config }) {
  useDocumentTitle(`${config.title} · Admin`);
  const { user } = useAuth();
  const toast = useToast();

  // The list state lives in the URL (?page, ?q, ?sort, ?order, ?<filter>) so it survives
  // a reload and can be linked to (the dashboard links to ?status=Pending).
  const [searchParams, setSearchParams] = useSearchParams();
  const page = Math.max(1, Number(searchParams.get("page")) || 1);
  const q = searchParams.get("q") || "";
  const sort = searchParams.get("sort") || "created_at";
  const order = searchParams.get("order") === "asc" ? "asc" : "desc";
  const filterParam = config.filter?.param;
  const filterValue = (filterParam && searchParams.get(filterParam)) || "all";

  const updateParams = useCallback(
    (changes, { resetPage = true } = {}) =>
      setSearchParams(
        (current) => {
          const next = new URLSearchParams(current);
          for (const [name, value] of Object.entries(changes)) {
            if (value === undefined || value === "" || value === "all") next.delete(name);
            else next.set(name, String(value));
          }
          if (resetPage) next.delete("page");
          return next;
        },
        { replace: true }
      ),
    [setSearchParams]
  );

  // Search box: typed text is sent to the API after a short pause
  const [searchDraft, setSearchDraft] = useState(q);
  useEffect(() => {
    if (searchDraft.trim() === q) return undefined;
    const timer = setTimeout(() => updateParams({ q: searchDraft.trim() }), SEARCH_DELAY_MS);
    return () => clearTimeout(timer);
  }, [searchDraft, q, updateParams]);

  const queryKey = searchParams.toString();
  const load = useCallback(
    () =>
      manageApi.list(resource, config.key, {
        page,
        pageSize: PAGE_SIZE,
        q: q || undefined,
        sort,
        order,
        ...(filterParam && filterValue !== "all" ? { [filterParam]: filterValue } : {})
      }),
    // queryKey covers every value read from the URL above
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [resource, config.key, queryKey]
  );
  const { data, loading, failed, error, reload } = useAsync(load);

  const [editing, setEditing] = useState(null); // { row } to edit, { row: null } to create
  const [pendingDelete, setPendingDelete] = useState(null);
  const [pendingRole, setPendingRole] = useState(null);
  const [busy, setBusy] = useState(false);

  const rows = data?.rows || [];
  const total = data?.pagination.total ?? 0;
  const searching = Boolean(q) || filterValue !== "all";

  // A page that no longer exists (rows deleted elsewhere, or an old link): go to the last one
  const lastPage = data?.pagination.totalPages ?? 1;
  const pastEnd = Boolean(data) && !loading && total > 0 && page > lastPage;
  useEffect(() => {
    if (pastEnd) updateParams({ page: lastPage > 1 ? lastPage : undefined }, { resetPage: false });
  }, [pastEnd, lastPage, updateParams]);

  const changeSort = (sortKey) => {
    if (sortKey === sort) updateParams({ order: order === "asc" ? "desc" : "asc" }, { resetPage: false });
    else updateParams({ sort: sortKey, order: DATE_SORTS.includes(sortKey) ? "desc" : "asc" }, { resetPage: false });
  };

  const save = async (values) => {
    const row = editing.row;
    if (row) {
      await manageApi.update(resource, row.id, values);
      toast.success(`${capitalize(config.singular)} updated.`);
    } else {
      await manageApi.create(resource, values);
      toast.success(`${capitalize(config.singular)} added.`);
    }
    setEditing(null);
    reload();
  };

  const confirmDelete = async () => {
    const target = pendingDelete;
    setBusy(true);
    try {
      await manageApi.remove(resource, target.id);
      toast.success(`${capitalize(config.singular)} deleted.`);
    } catch (deleteError) {
      if (deleteError.response?.status === 404) toast.info(`This ${config.singular} had already been deleted.`);
      else toast.error(getErrorMessage(deleteError, `We couldn't delete this ${config.singular}. Please try again.`));
    } finally {
      setBusy(false);
      setPendingDelete(null);
      reload(); // deleting the last row of a later page lands on the page before (pastEnd)
      requestAnimationFrame(() => document.getElementById("main")?.focus({ preventScroll: true }));
    }
  };

  const confirmRole = async () => {
    const { row, role } = pendingRole;
    setBusy(true);
    try {
      await manageApi.update(resource, row.id, { name: row.name, role });
      toast.success(role === "admin" ? `${row.name} is now an administrator.` : `${row.name} is now a member.`);
    } catch (roleError) {
      toast.error(getErrorMessage(roleError, "We couldn't change this account's role. Please try again."));
    } finally {
      setBusy(false);
      setPendingRole(null);
      reload();
    }
  };

  const actions = (row) => {
    if (config.detail) {
      return (
        <Button to={`/emergencies/${row.id}`} variant="secondary" size="sm" rightIcon={<LuArrowRight />} aria-label={`Open ${config.describe(row)}`}>
          Open
        </Button>
      );
    }
    if (config.isSelf?.(row, user)) {
      return <Badge>You</Badge>;
    }
    return (
      <div className={styles.rowActions}>
        {config.fields && (
          <Button variant="ghost" size="sm" leftIcon={<LuPencil />} onClick={() => setEditing({ row })} aria-label={`Edit ${config.describe(row)}`}>
            Edit
          </Button>
        )}
        {config.roleAction && (
          <Button
            variant="ghost"
            size="sm"
            leftIcon={<config.roleAction.icon />}
            onClick={() => setPendingRole({ row, role: row.role === "admin" ? "user" : "admin" })}
            aria-label={`${row.role === "admin" ? "Make member" : "Make administrator"}: ${config.describe(row)}`}
          >
            {row.role === "admin" ? "Make member" : "Make admin"}
          </Button>
        )}
        <Button
          variant="danger-ghost"
          size="sm"
          leftIcon={<LuTrash2 />}
          onClick={() => setPendingDelete(row)}
          aria-label={`Delete ${config.describe(row)}`}
        >
          Delete
        </Button>
      </div>
    );
  };

  let content;
  if ((loading && !data) || pastEnd) {
    content = <SkeletonTable label={`Loading ${config.title.toLowerCase()}`} />;
  } else if (failed && !data) {
    content = <ErrorState error={error} title={`${config.title} couldn't be loaded`} onRetry={reload} />;
  } else if (total === 0 && !searching) {
    content = (
      <div className={styles.emptyBox}>
        <EmptyState
          icon={<LuInbox />}
          title={`No ${config.title.toLowerCase()} yet`}
          description="Records appear here as soon as they are submitted."
        />
      </div>
    );
  } else if (total === 0) {
    content = (
      <div className={styles.emptyBox}>
        <EmptyState
          icon={<LuSearchX />}
          title="No matching records"
          description="Try a different search or filter."
          action={
            <Button
              variant="secondary"
              onClick={() => {
                setSearchDraft("");
                updateParams({ q: "", ...(filterParam ? { [filterParam]: "" } : {}) });
              }}
            >
              Clear search and filters
            </Button>
          }
        />
      </div>
    );
  } else {
    content = (
      <div className={loading ? styles.refreshing : undefined} aria-busy={loading}>
        <DataTable
          caption={config.title}
          columns={config.columns}
          rows={rows}
          actions={actions}
          pagination={data.pagination}
          onPageChange={(next) => updateParams({ page: next }, { resetPage: false })}
          sort={{ key: sort, order }}
          onSort={changeSort}
        />
      </div>
    );
  }

  const facets = filterParam ? data?.facets[filterParam] : null;
  const firstShown = (data?.pagination.page - 1) * PAGE_SIZE + 1;
  const summary = data && rows.length > 0
    ?`Showing ${firstShown}–${firstShown + rows.length - 1} of ${pluralize(total, "record")}`
    : undefined;

  return (
    <>
      <PageHeader
        eyebrow="Manage"
        title={config.title}
        description={config.description}
        actions={
          <div className={styles.headerActions}>
            {data && (
              <Button variant="secondary" leftIcon={<LuRefreshCw />} onClick={reload} loading={loading}>
                Refresh
              </Button>
            )}
            {config.fields && (
              <Button leftIcon={<LuPlus />} onClick={() => setEditing({ row: null })}>
                Add {config.singular}
              </Button>
            )}
          </div>
        }
      />

      {(data || q) && (
        <Toolbar summary={summary}>
          <SearchInput label={`Search ${config.title.toLowerCase()}`} placeholder="Search…" value={searchDraft} onChange={setSearchDraft} />
          {config.filter && (
            <SegmentedControl
              label={config.filter.label}
              value={filterValue}
              onChange={(value) => updateParams({ [filterParam]: value })}
              options={[
                { value: "all", label: "All", count: facets?.all },
                ...config.filter.options.map((option) => ({ ...option, count: facets?.[option.value] }))
              ]}
            />
          )}
        </Toolbar>
      )}

      {content}

      <Drawer
        open={Boolean(editing)}
        onClose={() => setEditing(null)}
        size="wide"
        closeLabel="Close form"
        title={editing?.row ? `Edit ${config.singular}` : `Add ${config.singular}`}
      >
        {editing && (
          <RecordForm
            key={editing.row?.id ?? "new"}
            fields={config.fields}
            initialValues={editing.row ? config.toForm(editing.row) : undefined}
            submitLabel={editing.row ? "Save changes" : `Add ${config.singular}`}
            onSave={save}
            onCancel={() => setEditing(null)}
          />
        )}
      </Drawer>

      <ConfirmDialog
        open={Boolean(pendingDelete)}
        title={`Delete this ${config.singular}?`}
        description={
          pendingDelete && (
            <>
              <p>
                You're about to permanently delete <strong>{config.describe(pendingDelete)}</strong>. This action cannot be undone.
              </p>
              {config.deleteNote && <p className={styles.deleteNote}>{config.deleteNote}</p>}
            </>
          )
        }
        confirmLabel={`Delete ${config.singular}`}
        loading={busy}
        onConfirm={confirmDelete}
        onCancel={() => setPendingDelete(null)}
      />

      <ConfirmDialog
        open={Boolean(pendingRole)}
        tone="primary"
        title={pendingRole?.role === "admin" ? "Make this person an administrator?" : "Remove administrator access?"}
        description={
          pendingRole && (
            <p>
              {pendingRole.role === "admin" ? (
                <>
                  <strong>{pendingRole.row.name}</strong> will be able to sign in to this admin portal and manage every record. They need to sign in again to get access.
                </>
              ) : (
                <>
                  <strong>{pendingRole.row.name}</strong> loses access to the admin portal immediately and keeps a member account.
                </>
              )}
            </p>
          )
        }
        confirmLabel={pendingRole?.role === "admin" ? "Make administrator" : "Make member"}
        loading={busy}
        onConfirm={confirmRole}
        onCancel={() => setPendingRole(null)}
      />
    </>
  );
}
