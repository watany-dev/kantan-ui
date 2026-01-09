import { describe, expect, it } from "vitest";
import {
	ALERT_ICONS,
	type AlertType,
	type MessageColorScheme,
	type MessageType,
	TOAST_COLORS,
	type ToastType,
	messageColors,
	messageIcons,
} from "../../../src/kt/theme";

describe("Theme", () => {
	describe("messageIcons", () => {
		it("should have icons for all message types", () => {
			expect(messageIcons.success).toBe("✓");
			expect(messageIcons.error).toBe("✕");
			expect(messageIcons.warning).toBe("⚠");
			expect(messageIcons.info).toBe("ℹ");
		});

		it("should have exactly 4 message types", () => {
			expect(Object.keys(messageIcons)).toHaveLength(4);
		});
	});

	describe("messageColors", () => {
		it("should have color scheme for success", () => {
			const scheme: MessageColorScheme = messageColors.success;
			expect(scheme.bg).toBe("#d4edda");
			expect(scheme.border).toBe("#c3e6cb");
			expect(scheme.icon).toBe("✓");
		});

		it("should have color scheme for error", () => {
			const scheme: MessageColorScheme = messageColors.error;
			expect(scheme.bg).toBe("#f8d7da");
			expect(scheme.border).toBe("#f5c6cb");
			expect(scheme.icon).toBe("✕");
		});

		it("should have color scheme for warning", () => {
			const scheme: MessageColorScheme = messageColors.warning;
			expect(scheme.bg).toBe("#fff3cd");
			expect(scheme.border).toBe("#ffeeba");
			expect(scheme.icon).toBe("⚠");
		});

		it("should have color scheme for info", () => {
			const scheme: MessageColorScheme = messageColors.info;
			expect(scheme.bg).toBe("#d1ecf1");
			expect(scheme.border).toBe("#bee5eb");
			expect(scheme.icon).toBe("ℹ");
		});

		it("should have exactly 4 message types", () => {
			expect(Object.keys(messageColors)).toHaveLength(4);
		});

		it("should have matching icons in messageColors and messageIcons", () => {
			const types: MessageType[] = ["success", "error", "warning", "info"];
			for (const type of types) {
				expect(messageColors[type].icon).toBe(messageIcons[type]);
			}
		});
	});

	describe("legacy aliases", () => {
		it("ALERT_ICONS should be same as messageIcons", () => {
			expect(ALERT_ICONS).toBe(messageIcons);
		});

		it("TOAST_COLORS should be same as messageColors", () => {
			expect(TOAST_COLORS).toBe(messageColors);
		});

		it("AlertType should be compatible with MessageType", () => {
			const alertType: AlertType = "success";
			const messageType: MessageType = alertType;
			expect(messageType).toBe("success");
		});

		it("ToastType should be compatible with MessageType", () => {
			const toastType: ToastType = "error";
			const messageType: MessageType = toastType;
			expect(messageType).toBe("error");
		});
	});
});
