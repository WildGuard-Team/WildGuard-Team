import { StrictMode } from 'react';
import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, afterEach, expect, it, vi } from 'vitest';
import useReportDetails from '../../src/features/community-reports/hooks/useReportDetails.js';
import { useDashboardReports } from '../../src/features/community-reports/hooks/useDashboardReports.js';

const ok = (body) => ({ ok: true, status: 200, json: async () => body });
function deferred() {
  let resolve;
  let reject;
  const promise = new Promise((yes, no) => { resolve = yes; reject = no; });
  return { promise, resolve, reject };
}
let fetchMock;
beforeEach(() => { fetchMock = vi.fn(); vi.stubGlobal('fetch', fetchMock); });
afterEach(() => vi.unstubAllGlobals());

it('does not request dashboard reports without an authenticated user', async () => {
  const { result, unmount } = renderHook(() => useDashboardReports(undefined));
  await act(async () => {});
  expect(result.current.loading).toBe(true);
  expect(fetchMock).not.toHaveBeenCalled();
  unmount();
});

it.each(['dashboard', 'details'])('%s StrictMode replay starts one real request and aborts on unmount', async (kind) => {
  const request = deferred();
  fetchMock.mockReturnValue(request.promise);
  const { unmount } = renderHook(() => kind === 'dashboard' ? useDashboardReports('owner') : useReportDetails('report'), { wrapper: StrictMode });
  await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
  const signal = fetchMock.mock.calls[0][1].signal;
  unmount();
  expect(signal.aborted).toBe(true);
  await act(async () => request.resolve(ok(kind === 'dashboard' ? { reports: [] } : { report: { _id: 'report' } })));
});

it.each(['dashboard', 'details'])('%s ignores an aborted rejection rather than showing an error', async (kind) => {
  fetchMock.mockRejectedValue(new DOMException('cancelled', 'AbortError'));
  const { result } = renderHook(() => kind === 'dashboard' ? useDashboardReports('owner') : useReportDetails('report'));
  await act(async () => {});
  expect(result.current.loading).toBe(true);
  expect(result.current.error).toBeFalsy();
});

it.each(['dashboard', 'details'])('%s ignores a stale error after switching identity and accepts the new request', async (kind) => {
  const request = deferred();
  fetchMock.mockReturnValueOnce(request.promise).mockResolvedValue(ok(kind === 'dashboard' ? { reports: [{ _id: 'new' }] } : { report: { _id: 'new' } }));
  const { result, rerender } = renderHook(({ id }) => kind === 'dashboard' ? useDashboardReports(id) : useReportDetails(id), { initialProps: { id: 'old' } });
  await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
  rerender({ id: 'new' });
  await waitFor(() => expect(result.current.loading).toBe(false));
  await act(async () => request.reject(new Error('late error')));
  expect(result.current.error).toBeFalsy();
  expect(kind === 'dashboard' ? result.current.reports[0]._id : result.current.report._id).toBe('new');
});
