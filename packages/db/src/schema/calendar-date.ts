import { customType } from "drizzle-orm/pg-core";

/**
 * PostgreSQL date values exposed as calendar-date strings.
 * Bun's SQL driver can return date columns as Date objects at UTC midnight.
 */
export const calendarDate = customType<{
	data: string;
	driverData: string | Date;
}>({
	dataType: () => "date",
	fromDriver: (value) =>
		typeof value === "string" ? value : value.toISOString().slice(0, 10),
});
