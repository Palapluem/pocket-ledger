import { expect, test } from "bun:test";

// Lab 5 C-02 TEMPORARY PROOF. This assertion is wrong on purpose, so that the required
// `build-test` check fails and GitHub blocks the merge. The PR carrying this file must
// never be merged; it is closed unmerged and its branch is kept as evidence.
test("C-02 deliberately failing required check (never merge)", () => {
	expect("build-test must block this merge").toBe("this assertion fails on purpose");
});
