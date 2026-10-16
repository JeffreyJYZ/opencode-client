import { describe, expect, test } from "bun:test";
import { ENGINES_ANY, satisfiesEngines } from "@/plugins/engines";

describe("satisfiesEngines", () => {
	test("`*` accepts any app version", () => {
		expect(ENGINES_ANY).toBe("*");
		expect(satisfiesEngines("*", "0.0.1")).toBe(true);
		expect(satisfiesEngines("*", "9.9.9")).toBe(true);
	});

	test("`>=` is a numeric comparison, not a text one", () => {
		expect(satisfiesEngines(">=0.10.0", "0.9.0")).toBe(false);
		expect(satisfiesEngines(">=0.10.0", "0.10.0")).toBe(true);
		expect(satisfiesEngines(">=0.10.0", "0.11.0")).toBe(true);
		expect(satisfiesEngines(">=1.2.3", "1.2.4")).toBe(true);
		expect(satisfiesEngines(">=1.2.3", "1.2.2")).toBe(false);
	});

	test("a range the host cannot read is not honoured", () => {
		expect(satisfiesEngines("~1.0.0", "1.0.0")).toBe(false);
		expect(satisfiesEngines(">1.0.0", "1.2.0")).toBe(false);
		expect(satisfiesEngines("", "1.0.0")).toBe(false);
		expect(satisfiesEngines(">=x.y.z", "1.0.0")).toBe(false);
	});
});
