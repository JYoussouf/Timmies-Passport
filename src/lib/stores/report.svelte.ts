/**
 * Open state for the report dialog.
 *
 * The dialog is mounted once at the layout, and anything that can raise a
 * report just asks this to open with the right context - so the support menu
 * and a store sheet share one form instead of two.
 */

export type ReportKind = 'bug' | 'location';

export interface ReportContext {
	kind: ReportKind;
	/** Human-readable thing being reported on, used as the issue title. */
	subject?: string;
	storeId?: string;
}

class ReportStore {
	context = $state<ReportContext | null>(null);

	get open(): boolean {
		return this.context !== null;
	}

	start(context: ReportContext) {
		this.context = context;
	}

	close() {
		this.context = null;
	}
}

export const report = new ReportStore();
