export type RunFilterItem = {
  run_id: string;
  workflow: string;
  status: string;
};

/** Filter a run history without changing its source ordering or records. */
export function filterRuns<T extends RunFilterItem>(
  runs: T[],
  query: string,
  statusFilter: string
): T[] {
  const normalizedQuery = query.trim().toLowerCase();
  return runs.filter((run) => {
    const matchesStatus = statusFilter === "all" || run.status === statusFilter;
    const searchable = `${run.workflow} ${run.status} ${run.run_id}`.toLowerCase();
    return matchesStatus && (!normalizedQuery || searchable.includes(normalizedQuery));
  });
}
