import React from "react";
import { MemoryRouter } from "react-router-dom";
import { render } from "@testing-library/react";

/** Flush pending promises in React tests. */
export async function flushPromises() {
  // Drain microtasks
  await Promise.resolve();
  await Promise.resolve();

  // Allow any setTimeout(0)/queued tasks to run in jsdom environment
  await new Promise((r) => setTimeout(r, 0));
}

/** Render helper with MemoryRouter and initial route. */
export function renderWithRouter(ui, { route = "/dashboard" } = {}) {
  return render(<MemoryRouter initialEntries={[route]}>{ui}</MemoryRouter>);
}
