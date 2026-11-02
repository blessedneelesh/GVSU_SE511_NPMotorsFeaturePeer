---
name: crud-page
description: Build or connect a full CRUD page (list + create/edit/delete + detail) for an NPMotors entity — Vendors, Vehicles, Sales Invoices, Banks, Parts, ... — from the Figma Make design, using the same Redux + redux-saga + reselect + service/mapper pattern as the Customers feature. Use when the user asks to build a page from Figma, integrate an API for a page/table/list page, add create/edit/delete (CRUD) to a page, or replicate the Customers pattern for another entity.
argument-hint: <entity> getAll=<path> [getById=<path>] [create=<path>] [update=<path>] [delete=<path>] [extra=name:METHOD:path,...] [api=https://localhost:PORT] [route=/path] [figmaNode=<code-node-id>] [pageSize=5]
---

# Full CRUD page from Figma (Customers pattern)

Arguments: `$ARGUMENTS`

## 1. Parse the arguments

| Arg | Required | Example | Meaning |
|---|---|---|---|
| `entity` (1st positional) | yes | `vendor` | Singular, lower-case. Derive `<Entity>` / `<plural>` / `<Plural>` / `<ENTITY>`. Handle irregular plurals (`bank-statement` → `bankStatements`, `parts` stays `parts`). |
| `getAll=` | yes | `<Entity>/GetAll<Plural>` | Paged GET list endpoint. |
| `getById=` | no | `<Entity>/Get<Entity>ById` | GET one record. Note whether the id goes in the path or the query. |
| `create=` | no | `<Entity>/Create<Entity>` | POST. |
| `update=` | no | `<Entity>/Update<Entity>` | PUT/PATCH (confirm the method in Swagger). |
| `delete=` | no | `<Entity>/Delete<Entity>` | DELETE. |
| `extra=` | no | `toggleStatus:PATCH:<Entity>/ToggleStatus` | Comma-separated `name:METHOD:path` endpoints (status toggle, lookups, reports). |
| `api=` | no | `https://localhost:7005` | Backend origin. Default: the Customers origin `https://localhost:7003`. |
| `route=` | no | `/<plural>` | Frontend route. Default: the matching entry in `src/app/navigation.ts`. |
| `figmaNode=` | no | `0-6` | Make code node for this page. Default: find the entity's page in the Make file. |
| `pageSize=` | no | `10` | Initial page size. Default `5`. |

All endpoint paths are **relative to the API origin, with no leading slash**. Their first segment (`<Entity>`) is the Vite proxy prefix.

If `entity` or `getAll` is missing, stop and ask. Skip every CRUD step whose endpoint wasn't given, and list the skipped steps in the final report.

## 2. Read the design from Figma (Figma MCP)

Make file: `https://www.figma.com/make/HoNlXxsTmtYeN6EBTfdlca/Car-Dealership-Management-System`. The fileKey is `HoNlXxsTmtYeN6EBTfdlca`, and `code-node-id` / `figmaNode` selects the file or node (`0-6` → `0:6`).

1. Call `create_session` with the fileKey, then load the `/figma-design-to-code` skill.
2. Call `get_design_context` and `get_screenshot` for the entity's page, its form/modal and its detail view.
3. Record:
   - table columns and their order, cell formatting (currency, dates, avatars), and badge colors per status
   - filters and search placeholder text
   - header actions (Add, Export, ...) and row actions (edit, delete, view)
   - create/edit form fields: label, input type, required, dropdown options, default value
   - the delete confirmation text
   - the detail view layout (if there is one)
4. The Figma output is a **reference, not code to paste**. Rebuild it with Fluent UI v9 (`@fluentui/react-components`, `@fluentui/react-icons`) and page-scoped CSS, as CustomersPage does. Don't copy Tailwind classes or shadcn components, and don't add dependencies.

If the MCP calls fail, ask the user to paste the page's code from Make's **Code** tab, or to list the columns and form fields.

## 3. Learn the real API contract. Don't guess field names.

GET endpoints: call the running backend (`-k` because the .NET dev cert is self-signed):

```bash
curl -sk "<api>/<getAll>?PageNumber=1&PageSize=2"
curl -sk "<api>/<getAll>?PageNumber=1&PageSize=2&SearchTerm=a"
curl -sk "<api>/<getAll>?PageNumber=1&PageSize=2&Status=active"   # once per candidate filter
curl -sk "<api>/<getById>..."                                     # with an id from the list
```

From the responses, record:
- **Exact property names and casing.** ASP.NET serializes `First_Name` as `first_Name`. The real spelling goes first in `DTO_FIELDS`.
- **The envelope**: a bare array, or `{ data | items | <plural> | $values }`, possibly nested.
- **`metaData.hasNext`**: whether it exists. If it doesn't, infer `hasNext` from `items.length === pageSize`.
- **Honored query params**: only add a UI filter if sending it changes the response.
- **The id field.** React keys, edit, delete and the detail view depend on it.

POST/PUT/DELETE: read the request and response schemas from Swagger. Swagger UI for the default API is at [https://localhost:7003/swagger/index.html](https://localhost:7003/swagger/index.html). Read the JSON spec behind it rather than the UI page:

```bash
curl -sk "https://localhost:7003/swagger/v1/swagger.json"   # default API (Customers origin)
curl -sk "<api>/swagger/v1/swagger.json"                     # when api= points at another service
```

If that path returns 404, open the Swagger UI page and use the spec URL shown in its definition dropdown, or ask the user. **Don't send writes to discover the contract.** Never call Create/Update/Delete against the real backend without the user's confirmation. Record the required fields, the validation attributes (max length, regex, ranges), the id location (path, query or body), and what each mutation returns (the entity, the id, or nothing).

If the API is down or returns errors, stop and tell the user. Don't invent a schema.

## 4. Files to create or extend

Read each Customers reference file, copy it, and rename it. Keep its structure, comment style, naming and idioms. Change only what the Deltas column says.

| Reference (read it) | New file | Deltas |
|---|---|---|
| `src/types/customers.ts` | `src/types/<plural>.ts` | `<Entity>` from step 3. Add `<Entity>Query` and `<Entity>Page`, plus `<Entity>StatusFilter` if there are filters. Add `<Entity>FormValues`: the form's shape (strings for inputs), not the DTO. Add `<Entity>Detail` if GetById returns more fields. **Import `RequestStatus` from `./common`; don't redefine it.** Types used by more than one feature go in `src/types/common.ts`, not in an entity file. |
| `src/services/api/apiConstants.ts` | *edit in place* | Add `<ENTITY>_ENDPOINTS = { getAll<Plural>, get<Entity>ById, create<Entity>, update<Entity>, delete<Entity>, ...extras } as const`. If `api` is a different origin, add `<ENTITY>_API_BASE_URL` from `import.meta.env.VITE_<ENTITY>_API_URL` with the same `DEV ? '/' : '<api>/'` fallback. |
| `src/services/api/customerClient.ts` | `src/services/api/<entity>Client.ts` *(only for a different origin)* | Same axios config, new base URL. Same origin → reuse `customerClient`. |
| `src/services/customers/customers.mappers.ts` | `src/services/<plural>/<plural>.mappers.ts` | `DTO_FIELDS`: the real spelling first, then camel/Pascal/snake variants. Add `<plural>` to `COLLECTION_KEYS`. `map<Entity>` and `map<Entity>Collection` use `readString`/`readNumber` on every field. Keep `unwrapCollection`, `readHasNext` and a `normalize<Status>` helper for enum-like fields. If GetById returns the same shape as a list row (Customers does: a bare object, no envelope), reuse `map<Entity>` for it. **Add** `to<Entity>RequestDto(values: <Entity>FormValues)`, which converts form strings to the backend's types and exact casing (from Swagger). |
| `src/services/customers/customers.api.ts` | `src/services/<plural>/<plural>.api.ts` | `get<Plural>`: PascalCase query params as the backend binds them; leave out empty and `'all'` filters. **Add** `get<Entity>ById`, `create<Entity>`, `update<Entity>`, `delete<Entity>` and the extras. Every call takes `signal?: AbortSignal` and returns mapped types, never raw `data`. Export `<plural>Api = { ... }`. |
| `src/services/customers/customers.errors.ts` | `src/services/<plural>/<plural>.errors.ts` | `UNREACHABLE_MESSAGE` with the right port and an entity `FALLBACK_MESSAGE`. Keep cancellation → `''` and the proxy 500/502–504 handling, and the `fallback` parameter. Add `get<Entity>DetailErrorMessage` (404 → "no longer exists"), as Customers does. **Add** `get<Entity>FieldErrors(error): Partial<Record<keyof <Entity>FormValues, string>>`, which maps ProblemDetails `errors` keys (case-insensitive, e.g. `Vendor_Name`) onto form fields. |
| `src/redux/customers/customers.constants.ts` | `src/redux/<plural>/<plural>.constants.ts` | `<ENTITY>_ACTIONS`. List: `LOAD`, `LOAD_SUCCESS`, `LOAD_FAILURE`, `SET_SEARCH`, `SET_PAGE`, `SET_PAGE_SIZE`, and one `SET_<FILTER>` per filter. Detail (as Customers): `SELECT` (payload: id), `CLEAR_SELECTION`, `LOAD_BY_ID_SUCCESS`, `LOAD_BY_ID_FAILURE`. CRUD: `CREATE`, `UPDATE` and `DELETE`, each with `_SUCCESS`/`_FAILURE`, plus `RESET_SAVE`. Every type string is `'<plural>/…'`. |
| `src/redux/customers/customers.actions.ts` | `src/redux/<plural>/<plural>.actions.ts` | Same creator style (`(...) => ({ type, payload })`). Mutation creators carry `<Entity>FormValues` (+ id). Failures carry `{ message, fieldErrors }`. Export the `<Plural>Action` union with **every** creator. |
| `src/redux/customers/customers.reducer.ts` | `src/redux/<plural>/<plural>.reducer.ts` | List state as Customers (`items, hasNext, query, listStatus, listError`; `query.pageSize` from `pageSize=`). Detail state as Customers: `selectedId`, `selected: <Entity>Detail \| null`, `detailStatus`, `detailError` (`SELECT` sets `selectedId`, clears `selected`, sets `detailStatus: 'loading'`). **Add** `saveStatus`, `saveError`, `fieldErrors`, `deleteStatus` and `deleteError`. Keep the `is<Plural>Action` Set type guard and the exhaustive `never` default. Search, filter and page-size changes reset `pageNumber` to 1 and set `listStatus: 'loading'`. `RESET_SAVE` clears the save/delete status and errors. |
| `src/redux/customers/customers.selectors.ts` | `src/redux/<plural>/<plural>.selectors.ts` | `select<Entity>State = (state: RootState) => state.<plural>`, then one `createSelector` per field. |
| `src/redux/customers/customers.saga.ts` | `src/redux/<plural>/<plural>.saga.ts` | List worker unchanged: `takeLatest` over `LOAD` + every `SET_*`, with `AbortController` + `cancelled()` in `finally`. Detail: `takeLatest([SELECT, CLEAR_SELECTION], load<Entity>ByIdWorker)`. The worker returns early on `CLEAR_SELECTION`, which exists only so closing the view cancels an in-flight lookup. `CREATE`/`UPDATE`/`DELETE` → **`takeLeading`**, so a double-click can't submit twice. After a successful mutation, `put(load<Plural>())` to refetch the current server page. Combine all watchers in one `yield all([...])` in the default export. List errors go through `get<Entity>ErrorMessage`, detail errors through `get<Entity>DetailErrorMessage`, and mutation errors through `get<Entity>ErrorMessage` + `get<Entity>FieldErrors`. |
| `src/hooks/useCustomers.ts` | `src/hooks/use<Plural>.ts` | Same API: load on mount, 300 ms debounced search, `useCallback` dispatchers, `retry`, `hasPrevious`, and an explicit `Use<Plural>Result` interface. |
| `src/hooks/useCustomerDetail.ts` | `src/hooks/use<Entity>Detail.ts` | Same API: `selectedId`, `<entity>`, `detailStatus`, `detailError`, `open<Entity>(id)`, `close<Entity>()`, `retry`. |
| — | `src/hooks/use<Entity>Mutations.ts` | Separate hook: `create`, `update`, `remove`, `resetSave`, plus `saveStatus`/`saveError`/`fieldErrors`/`deleteStatus`. Same style as `use<Plural>`. |
| `src/pages/CustomersPage/CustomersPage.tsx` | `src/pages/<Plural>Page/<Plural>Page.tsx` | Columns, labels and badges from the design. Everything else follows **Page flow** below. **Add** an "Add <Entity>" header button and edit/delete row actions (icon `Button`s with `aria-label`s). |
| — | `src/pages/<Plural>Page/<Entity>FormDialog.tsx` | Fluent `Dialog` with a `mode: 'create' \| 'edit'` prop and `initialValues`. Uses `Field` + `Input`/`Dropdown`/`Textarea` per the design. Client-side validation mirrors the Swagger rules. `fieldErrors` from the server show on the fields and `saveError` shows in a `MessageBar`. Submit is disabled while `saveStatus === 'loading'`. Closes and calls `resetSave` on success. |
| — | `src/pages/<Plural>Page/Delete<Entity>Dialog.tsx` | Confirmation `Dialog` that names the record. Cancel / Delete (danger), with Delete disabled while deleting. Shows `deleteError`. |
| `src/pages/CustomersPage/CustomerDetail.tsx` | `src/pages/<Plural>Page/<Entity>Detail.tsx` *(only if the design has one)* | Exported container that reads `use<Entity>Detail()`: breadcrumb (`← <Plural>` calls `close<Entity>`; the title falls back to `'<Entity>'` while loading), error `MessageBar` + Retry, `Spinner`, then on `detailStatus === 'success'` a non-exported presentational `<Entity>Profile` in the same file. The page renders `<<Entity>Detail />` when `selectedId` is set, and rows call `open<Entity>(row.id)`. No local `useState` for the selection. |
| `src/pages/CustomersPage/CustomersPage.css` | `src/pages/<Plural>Page/<Plural>Page.css` | Scope everything under `.<plural>-page`. Copy the CSS variable block and only the primitives the page uses (card, badge, the `.data-table` block, text helpers). Rename `.customers-*` → `.<plural>-*`. |
| `src/pages/CustomersPage/customerMetrics.ts` | `src/pages/<Plural>Page/<entity>Metrics.ts` *(if needed)* | Formatters/initials for this entity. Reuse `formatCurrency` by importing it if the format is identical. |

Success feedback after create/update/delete: a `MessageBar` above the table or a Fluent `Toast`, whichever the design shows.

### Page flow (mirror `CustomersPage.tsx` in this order)

1. **Module scope:** `pageSizeOptions = [5, 10, 25, 50]`; `<filter>Options: { value, label }[]` with `'all'` first; an `is<Filter>` type guard (`options.some(o => o.value === value)`) so `Dropdown` values are narrowed without casts; `export<Plural>(rows)` builds a quoted CSV from the current page and downloads `<plural>.csv`.
2. **Hooks first:** destructure `use<Plural>()` and `const { selectedId, open<Entity> } = use<Entity>Detail()`. Call every hook before any early return (Rules of Hooks).
3. **Detail switch:** `if (selectedId) return <<Entity>Detail />`. The list hook stays mounted, so the query and page survive the round trip.
4. **Derived flags:** compute these exactly, with no extra state:
   - `isLoading = listStatus === 'loading'`
   - `isInitialLoad = (isLoading || listStatus === 'idle') && items.length === 0`
   - `hasActiveFilters = query.searchTerm !== '' || <each filter> !== 'all'`
   - `<filter>Label` comes from the options list
   - `showTable = !isInitialLoad && listStatus !== 'error'`
5. **Render** `<div className="<plural>-page">`:
   1. Header with an `h1`, the text "`{n} {n === 1 ? '<entity>' : '<plural>'} on this page`" (there's no total count), and actions: Export (disabled when there are no rows), plus Add (new).
   2. Filters: a `SearchBox` bound to `searchInput` (debounced in the hook), then one `Dropdown` per filter with `value={label}` and `selectedOptions={[query.<filter>]}`.
   3. On `listStatus === 'error'`, show a `MessageBar intent="error"` with a "Couldn't load <plural>" title and a Retry button. The table is **hidden**, not shown stale.
   4. On `isInitialLoad`, show `Spinner` in `section.card.<plural>-loading`.
   5. On `showTable`, show `section.card` containing:
      - `div.table-scroll`, which gets `is-refreshing` while `isLoading`
      - `Table` with `aria-label` and `aria-busy={isLoading}`
      - rows keyed by `id || <unique fallback>`
      - empty cells render `'—'`
      - the name/primary cell is a `Link as="button"` with `disabled={!row.id}` that calls `open<Entity>(row.id)`
      - the empty row reads "No more <plural> on this page." when `pageNumber > 1`, otherwise "No <plural> found." plus a clear-filters hint when `hasActiveFilters`
      - then `TablePagination` with `rowCount={items.length}` and `itemLabel="<plural>"`
6. **New for CRUD:** edit/delete row actions go in a last column; adjust the empty row's `colSpan`. The form and delete dialogs are rendered once at the end of the page root and driven by local `useState` for which record is being edited or deleted. That state is UI-only; the save status lives in Redux.

## 5. Register the feature (all required, or the page silently does nothing)

1. `src/redux/rootReducer.ts`: add `<plural>: <plural>Reducer` to `combineReducers`.
2. `src/redux/rootSaga.ts`: add `fork(<plural>Saga)` to `all([...])`.
3. `src/app/routes.tsx`: import the page, add `<route>` to `builtPaths`, and add `<Route path="<route>" element={<<Plural>Page />} />`. Otherwise the route still renders `ComingSoonPage`.
4. `vite.config.ts`: add a proxy entry for the endpoint prefix, `'/<Entity>': { target: '<api>', changeOrigin: true, secure: false }`, with a comment like the Customer one, unless it already exists. **The proxy matches case-sensitively, so the prefix must not equal a frontend route**: `/Vendor` is safe next to `/vendors`, but a `/vendors` prefix would break the page on refresh. Tell the user to **restart `npm run dev`**, because proxy changes aren't hot-reloaded.
5. `.env.example`: document `# VITE_<ENTITY>_API_URL=<api>/` if you added a new base URL.

## 6. Verify

```bash
npx tsc -b
npm run lint
```

Both must pass with zero errors. Then, if the dev server and API are running, open the route and check:
- **List:** rows render; search is debounced; changing the filter or page size returns to page 1; Next is disabled on the last page.
- **Detail:** clicking a name shows the spinner, then the record from GetById; an unknown id shows the "no longer exists" error; Back returns to the same page, search and filters.
- **Create:** client-side validation errors show, server validation errors appear on the right fields, success closes the dialog and refreshes the list, and double-clicking Submit creates only one record.
- **Edit:** the dialog opens pre-filled, and saving updates the row.
- **Delete:** Cancel does nothing, and Confirm removes the row.
- **API down:** stopping the API shows the error bar, and Retry recovers.

Ask before creating or deleting real data. Report anything you couldn't verify and every CRUD step skipped for a missing endpoint.

## Important considerations

- **The real response is the contract.** Mappers follow what `curl`/Swagger returned, not the Figma design or the backend entity class.
- **Mappers are the trust boundary.** API data is `unknown` until mapped. No `any`, and no `response.data.x` in components or sagas. Missing fields fall back to `''`, `0` or a default status, so one bad row can't crash the table.
- **Server-side paging, filtering and search only.** `items` holds one page, so client-side filtering or sorting gives wrong results. After any mutation, refetch the page instead of patching `items`.
- **No total count.** `TablePagination` runs on `hasNext` (from `metaData` or inferred), so don't add "Page X of Y".
- **Race safety.** `takeLatest` + `AbortController` cancels stale list requests. `takeLeading` blocks duplicate mutations. Error helpers return `''` for cancellations so no error shows.
- **Components touch Redux only through the hooks** (`use<Plural>`, `use<Entity>Detail`, `use<Entity>Mutations`), never through `useAppSelector`/`useAppDispatch` directly.
- **Action type strings must be unique** (`'<plural>/…'`). The reducer's `Set` type guard relies on that, and a collision would make two reducers react to one action.
- **Reuse, don't fork:** `RequestStatus` (`src/types/common.ts`), `TablePagination`, `useAppDispatch`/`useAppSelector`, and the axios client when the origin is the same. If you're about to copy `isRecord`/ProblemDetails a third time, suggest extracting them to `src/services/api/` instead of doing it silently.
- **Multiple .NET services/ports:** each needs its own base URL constant, client, env var and proxy entry. In production (no proxy), the API must allow the frontend origin via CORS.
- **Every table is a Fluent `Table`** (`Table`/`TableHeader`/`TableRow`/`TableHeaderCell`/`TableBody`/`TableCell`), in the list and in detail views, never a plain `<table>`. Give it `className="data-table <name>-table"`: `.data-table` holds the shared cell styles and text-helper overrides, and `.<name>-table` sets only its `min-width`. Empty states are a last `TableRow` with one `TableCell colSpan={n} className="table-empty"`.
- **Scope CSS** under `.<plural>-page`, because `App.css` styles every `table`/`th`/`td` globally.
- **Never edit the backend.** If the API is missing something the design needs, report it as a follow-up.

## Example

```
/crud-page vendor getAll=Vendor/GetAllVendors getById=Vendor/GetVendorById create=Vendor/CreateVendor update=Vendor/UpdateVendor delete=Vendor/DeleteVendor api=https://localhost:7005
```
