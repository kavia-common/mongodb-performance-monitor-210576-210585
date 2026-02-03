import React from "react";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import DashboardPage from "../pages/DashboardPage";

jest.mock("../lib/metricsService", () => ({
  tryHealthCheck: jest.fn(),
  getMetricsSnapshot: jest.fn(),
  getMetricsTimeseries: jest.fn(),
}));

const metricsService = require("../lib/metricsService");

function isoMinusMinutes(min) {
  return new Date(Date.now() - min * 60 * 1000).toISOString();
}

test("loads health + metrics on mount and passes from/to ISO strings", async () => {
  metricsService.tryHealthCheck.mockResolvedValue({ ok: true, details: { status: "ok" }, error: null });
  metricsService.getMetricsSnapshot.mockResolvedValue({ sampledAt: new Date().toISOString(), connections: 1, opsPerSec: 2, slowOpsPerMin: 0 });
  metricsService.getMetricsTimeseries.mockResolvedValue([
    { t: isoMinusMinutes(10), connections: 1, opsPerSec: 2, slowOpsPerSec: 0 },
    { t: isoMinusMinutes(5), connections: 2, opsPerSec: 3, slowOpsPerSec: 0 },
  ]);

  render(<DashboardPage />);

  await waitFor(() => expect(metricsService.tryHealthCheck).toHaveBeenCalledTimes(1));
  await waitFor(() => expect(metricsService.getMetricsSnapshot).toHaveBeenCalledTimes(1));
  await waitFor(() => expect(metricsService.getMetricsTimeseries).toHaveBeenCalledTimes(1));

  const snapArgs = metricsService.getMetricsSnapshot.mock.calls[0][0];
  const tsArgs = metricsService.getMetricsTimeseries.mock.calls[0][0];

  expect(snapArgs).toHaveProperty("from");
  expect(snapArgs).toHaveProperty("to");
  expect(typeof snapArgs.from).toBe("string");
  expect(typeof snapArgs.to).toBe("string");

  expect(tsArgs).toHaveProperty("from");
  expect(tsArgs).toHaveProperty("to");
  expect(typeof tsArgs.from).toBe("string");
  expect(typeof tsArgs.to).toBe("string");

  // page header present
  expect(await screen.findByText(/MongoDB Performance Overview/i)).toBeInTheDocument();
});

test("time range selector triggers reload (and uses from/to)", async () => {
  const user = userEvent.setup();
  metricsService.tryHealthCheck.mockResolvedValue({ ok: true, details: { status: "ok" }, error: null });
  metricsService.getMetricsSnapshot.mockResolvedValue({ sampledAt: new Date().toISOString(), connections: 1, opsPerSec: 2, slowOpsPerMin: 0 });
  metricsService.getMetricsTimeseries.mockResolvedValue([]);

  render(<DashboardPage />);

  // initial load
  await waitFor(() => expect(metricsService.getMetricsTimeseries).toHaveBeenCalledTimes(1));

  await user.selectOptions(screen.getByLabelText(/select time range/i), "24h");
  await waitFor(() => expect(metricsService.getMetricsTimeseries).toHaveBeenCalledTimes(2));

  const tsArgs = metricsService.getMetricsTimeseries.mock.calls[1][0];
  expect(typeof tsArgs.from).toBe("string");
  expect(typeof tsArgs.to).toBe("string");
});

test("renders error state when metrics service throws", async () => {
  metricsService.tryHealthCheck.mockResolvedValue({ ok: true, details: { status: "ok" }, error: null });
  metricsService.getMetricsSnapshot.mockRejectedValue(new Error("boom"));
  metricsService.getMetricsTimeseries.mockResolvedValue([]);

  render(<DashboardPage />);

  expect(await screen.findByText(/Metrics load failed/i)).toBeInTheDocument();
  expect(screen.getByText(/boom/i)).toBeInTheDocument();
});

test("renders empty chart state when series has insufficient points", async () => {
  metricsService.tryHealthCheck.mockResolvedValue({ ok: true, details: { status: "ok" }, error: null });
  metricsService.getMetricsSnapshot.mockResolvedValue({ sampledAt: new Date().toISOString(), connections: 1, opsPerSec: 2, slowOpsPerMin: 0 });
  // only 1 point => hasSeries false => EmptyState
  metricsService.getMetricsTimeseries.mockResolvedValue([{ t: new Date().toISOString(), connections: 1, opsPerSec: 2, slowOpsPerSec: 0 }]);

  render(<DashboardPage />);

  expect(await screen.findAllByText(/No data/i)).toHaveLength(2);
});
