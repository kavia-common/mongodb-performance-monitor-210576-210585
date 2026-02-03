import React from "react";
import { MemoryRouter } from "react-router-dom";
import { render } from "@testing-library/react";

/** Flush pending promises in React tests. */
export async function flushPromises() {
  // One tick for pending microtasks
  await Promise.resolve();
}

/** Render helper with MemoryRouter and initial route. */
export function renderWithRouter(ui, { route = "/dashboard" } = {}) {
  return render(<MemoryRouter initialEntries={[route]}>{ui}</MemoryRouter>);
}
