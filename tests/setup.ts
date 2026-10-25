import "@testing-library/jest-dom/vitest";
import { afterEach } from "vitest";
import { cleanup } from "@testing-library/react";

afterEach(() => cleanup());

afterEach(() => {
  try {
    window.localStorage.clear(); // saved edits and picks must never leak from one test into the next
  } catch {
    /* not a browser test */
  }
});
