import React from "react";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import AlertsPage from "../pages/AlertsPage";

jest.mock("../lib/alertsService", () => ({
  listAlertRules: jest.fn(),
  createAlertRule: jest.fn(),
  updateAlertRule: jest.fn(),
  deleteAlertRule: jest.fn(),
  setAlertRuleEnabled: jest.fn(),
  listAlertEvents: jest.fn(),
}));

const alertsService = require("../lib/alertsService");

test("loads rules and shows empty state when no rules", async () => {
  alertsService.listAlertRules.mockResolvedValue({ items: [] });
  alertsService.listAlertEvents.mockResolvedValue({ items: [], nextCursor: null });

  render(<AlertsPage />);

  expect(await screen.findAllByText(/No alerts yet/i)).toHaveLength(2); // rules + events empty
  await waitFor(() => expect(alertsService.listAlertRules).toHaveBeenCalledTimes(1));
  await waitFor(() => expect(alertsService.listAlertEvents).toHaveBeenCalledTimes(1));
});

test("renders rules table and allows toggling enable (optimistic)", async () => {
  const user = userEvent.setup();
  alertsService.listAlertRules.mockResolvedValue({
    items: [{ id: "r1", name: "Rule 1", enabled: true, severity: "HIGH", metric: "x", comparator: ">", threshold: 1 }],
  });
  alertsService.listAlertEvents.mockResolvedValue({ items: [], nextCursor: null });
  alertsService.setAlertRuleEnabled.mockResolvedValue({ ok: true });

  render(<AlertsPage />);

  expect(await screen.findByRole("table", { name: /alert rules table/i })).toBeInTheDocument();
  expect(await screen.findByText("Rule 1")).toBeInTheDocument();

  const disableBtn = await screen.findByRole("button", { name: /Disable/i });
  await user.click(disableBtn);

  await waitFor(() => expect(alertsService.setAlertRuleEnabled).toHaveBeenCalledWith("r1", false));
});

test("shows error UI when events feed fails", async () => {
  alertsService.listAlertRules.mockResolvedValue({ items: [] });
  alertsService.listAlertEvents.mockRejectedValue(new Error("events down"));

  render(<AlertsPage />);

  expect(await screen.findByText(/Couldn’t load events/i)).toBeInTheDocument();
  expect(screen.getByText(/events down/i)).toBeInTheDocument();
});
