import React from "react";
import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import InstancesPage from "../pages/InstancesPage";

jest.mock("../lib/instancesService", () => ({
  listInstances: jest.fn(),
  createInstance: jest.fn(),
  updateInstance: jest.fn(),
  deleteInstance: jest.fn(),
}));

const instancesService = require("../lib/instancesService");

test("renders empty state when no instances", async () => {
  instancesService.listInstances.mockResolvedValue({ items: [] });

  render(<InstancesPage />);

  expect(await screen.findByText(/No instances yet/i)).toBeInTheDocument();
  await waitFor(() => expect(instancesService.listInstances).toHaveBeenCalledTimes(1));
});

test("renders table when instances exist", async () => {
  instancesService.listInstances.mockResolvedValue({
    items: [{ id: "i1", name: "Local", uri: "mongodb://localhost:27017", enabled: true, notes: "n" }],
  });

  render(<InstancesPage />);

  expect(await screen.findByRole("table", { name: /instances table/i })).toBeInTheDocument();
  expect(screen.getByText("Local")).toBeInTheDocument();
  expect(screen.getByText(/mongodb:\/\/localhost:27017/i)).toBeInTheDocument();
});

test("create flow calls createInstance then reloads list", async () => {
  const user = userEvent.setup();

  instancesService.listInstances
    .mockResolvedValueOnce({ items: [] })
    .mockResolvedValueOnce({ items: [{ id: "i2", name: "New", uri: "mongodb://x", enabled: true }] });

  instancesService.createInstance.mockResolvedValue({ id: "i2", name: "New", uri: "mongodb://x", enabled: true });

  render(<InstancesPage />);

  expect(await screen.findByText(/No instances yet/i)).toBeInTheDocument();

  await user.click(screen.getByRole("button", { name: /\+ Add instance/i }));

  // Modal fields are defined in InstanceFormModal; we target the common ones by label text
  await user.type(await screen.findByLabelText(/Name/i), "New");
  await user.type(screen.getByLabelText(/Host/i), "localhost");
  await user.type(screen.getByLabelText(/Port/i), "27017");

  await user.click(await screen.findByRole("button", { name: /Save/i }));

  await waitFor(() => expect(instancesService.createInstance).toHaveBeenCalled());
  await waitFor(() => expect(instancesService.listInstances).toHaveBeenCalledTimes(2));

  expect(await screen.findByRole("table", { name: /instances table/i })).toBeInTheDocument();
  const table = screen.getByRole("table", { name: /instances table/i });
  expect(within(table).getByText("New")).toBeInTheDocument();
});
