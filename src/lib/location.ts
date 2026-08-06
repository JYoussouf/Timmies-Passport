import type { LocationProps } from './types';

/**
 * How a Tim Hortons is named in a list.
 *
 * Every store shares the name "Tim Hortons", so the name alone produces a wall
 * of identical rows. Fall through to the most specific thing we know, and never
 * label a store by its region: "Ontario" describes hundreds of them.
 */
export function locationLabel(p: LocationProps | undefined): string {
	if (!p) return 'Tim Hortons';
	return p.address || p.city || p.name || 'Tim Hortons';
}

/** The supporting line beneath the label, minus whatever the label already used. */
export function locationPlace(p: LocationProps | undefined): string {
	if (!p) return '';
	const label = locationLabel(p);
	return [p.city, p.region, p.country].filter((v) => v && v !== label).join(', ');
}
