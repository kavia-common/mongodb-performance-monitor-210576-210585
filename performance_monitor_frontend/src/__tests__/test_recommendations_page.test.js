import React from "react";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import RecommendationsPage from "../pages/RecommendationsPage";

jest.mock("../lib/recommendationsService", () => ({
  listRecommendations: jest.fn(),
  applyRecommendation: jest.fn(),
  dismissRecommendation: jest.fn(),
  restoreRecommendation: jest.fn(),
  updateRecommendationStatus: jest.fn(),
}));

const recsService = require("../lib/recommendationsService");

test("shows empty state when no recommendations", async () => {
  recsService.listRecommendations.mockResolvedValue({ items: [] });

  render(<RecommendationsPage />);

  expect(await screen.findByText(/No recommendations yet/i)).toBeInTheDocument();
  await waitFor(() => expect(recsService.listRecommendations).toHaveBeenCalled());
});

test("renders list and can apply/dismiss/restore", async () => {
  const user = userEvent.setup();
  recsService.listRecommendations.mockResolvedValue({
    items: [{ id: "rec1", title: "Add an index", description: "desc", type: "indexing", status: "open", severity: "HIGH", instanceId: "i1" }],
  });
  recsService.applyRecommendation.mockResolvedValue({ id: "rec1", status: "applied" });
  recsService.dismissRecommendation.mockResolvedValue({ id: "rec1", status: "dismissed" });
  recsService.restoreRecommendation.mockResolvedValue({ id: "rec1", status: "open" });

  render(<RecommendationsPage />);

  expect(await screen.findByRole("table", { name: /recommendations table/i })).toBeInTheDocument();
  expect(await screen.findByText(/Add an index/i)).toBeInTheDocument();

  await user.click(await screen.findByRole("button", { name: /Apply/i }));
  await waitFor(() => expect(recsService.applyRecommendation).toHaveBeenCalledWith("rec1"));

  await user.click(await screen.findByRole("button", { name: /Dismiss/i }));
  await waitFor(() => expect(recsService.dismissRecommendation).toHaveBeenCalledWith("rec1"));

  await user.click(await screen.findByRole("button", { name: /Restore/i }));
  await waitFor(() => expect(recsService.restoreRecommendation).toHaveBeenCalledWith("rec1"));
});

test("on status update failure, reloads list", async () => {
  const user = userEvent.setup();

  recsService.listRecommendations
    .mockResolvedValueOnce({
      items: [{ id: "rec1", title: "Tune pooling", description: "desc", type: "pooling", status: "open", severity: "MEDIUM", instanceId: "i1" }],
    })
    .mockResolvedValueOnce({
      items: [{ id: "rec1", title: "Tune pooling", description: "desc", type: "pooling", status: "open", severity: "MEDIUM", instanceId: "i1" }],
    });

  recsService.applyRecommendation.mockRejectedValue(new Error("fail apply"));

  render(<RecommendationsPage />);

  expect(await screen.findByText(/Tune pooling/i)).toBeInTheDocument();

  await user.click(await screen.findByRole("button", { name: /Apply/i }));
  await waitFor(() => expect(recsService.applyRecommendation).toHaveBeenCalledWith("rec1"));
  await waitFor(() => expect(recsService.listRecommendations).toHaveBeenCalledTimes(2));
});
