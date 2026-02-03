import React from "react";
import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import App from "../App";
import { renderWithRouter } from "./testUtils";

test("renders app shell and navigates between pages via sidebar", async () => {
  const user = userEvent.setup();
  renderWithRouter(<App />, { route: "/dashboard" });

  expect(screen.getByRole("navigation", { name: /primary navigation/i })).toBeInTheDocument();
  expect(screen.getByText(/MongoDB Performance Overview/i)).toBeInTheDocument();

  await user.click(screen.getByRole("link", { name: /Alerts/i }));
  expect(await screen.findByText(/Performance Alerts/i)).toBeInTheDocument();

  await user.click(screen.getByRole("link", { name: /Recommendations/i }));
  expect(await screen.findByText(/Tuning & Best Practices/i)).toBeInTheDocument();

  await user.click(screen.getByRole("link", { name: /Instances/i }));
  expect(await screen.findByText(/MongoDB Instances/i)).toBeInTheDocument();
});

test("unknown route shows 404 card", () => {
  renderWithRouter(<App />, { route: "/nope" });
  expect(screen.getByText("Page not found")).toBeInTheDocument();
});
