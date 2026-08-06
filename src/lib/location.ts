import type { LocationProps } from './types';

/**
 * A civic address has a house number. Roughly half of OSM's Tim Hortons only
 * resolve to a street, and calling "Tecumseh Road East" this store's address
 * is simply wrong - it is the road it sits on.
 */
function hasHouseNumber(address: string): boolean {
	return /\d/.test(address);
}

/**
 * How a Tim Hortons is named in a list.
 *
 * Every store shares the name "Tim Hortons", so the name alone produces a wall
 * of identical rows. Lead with the civic address where we have one, fall back
 * to naming the street it sits on, and never label a store by its region:
 * "Ontario" describes hundreds of them.
 */
export function locationLabel(p: LocationProps | undefined): string {
	if (!p) return 'Tim Hortons';
	const name = p.name || 'Tim Hortons';
	if (p.address && hasHouseNumber(p.address)) return p.address;
	if (p.address) return `${name} on ${p.address}`;
	if (p.city) return `${name}, ${p.city}`;
	return name;
}

/** The supporting line beneath the label, minus whatever the label already used. */
export function locationPlace(p: LocationProps | undefined): string {
	if (!p) return '';
	const label = locationLabel(p);
	return [p.city, p.region, p.country].filter((v) => v && !label.includes(v)).join(', ');
}
