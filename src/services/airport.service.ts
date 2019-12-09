import { DocumentScope, ServerScope } from '@cloudant/cloudant';
import { WebError } from 'advanced-controllers';
import { Inject, Injectable, InjectionToken } from 'injection-js';
import { orderBy, take } from 'lodash';
import nano from 'nano';

import { Config } from '../config';
import { Airport } from '../models';

export const CLOUDANT = new InjectionToken<string>('CloudantInstance');

const EARTH_RADIUS = 6371e3; // in meters
const MIN_LAT = -Math.PI / 2;
const MAX_LAT = Math.PI / 2;
const MIN_LON = -Math.PI;
const MAX_LON = Math.PI;

export interface AirportResult {
	totalRows: number;
	bookmark: string;
	rows: Airport[];
}

@Injectable()
export class AirportService {

	private db: DocumentScope<Airport>;

	constructor(
		private config: Config,
		@Inject(CLOUDANT) private cloudant: ServerScope,
	) {
		this.db = this.cloudant.use(this.config.cloudantDb);
	}

	// public async getAirports(radius: number, lat: number, lon: number, limit: number): Promise<AirportResult> {
	// 	return new Promise((resolve, reject) => {
	// 		// Get bounding box
	// 		const [[minLat, minLon], [maxLat, maxLon]] = this.getBoundingBox(lat, lon, radius);

	// 		// Prepare filter
	// 		const query = `lon:[${minLon} TO ${maxLon}] AND lat:[${minLat} TO ${maxLat}]`;


	// 		// // Run search
	// 		// this.db.search('view1', 'geo', { q: query, limit }, (err, result) => {
	// 		// 	if (err) { reject(err); }

	// 		// 	const { total_rows, bookmark, rows } = result;
	// 		// 	console.log('Showing %d out of a total %d airports', rows.length, total_rows);

	// 		// 	// Filter result to airports within the circle
	// 		// 	const transformedRows = rows
	// 		// 		.filter((row) => this.getDistance(lat, lon, (row.fields as any).lat, (row.fields as any).lon) <= radius)
	// 		// 		.map((row) => ({ id: row.id, ...row.fields } as Airport));
	// 		// 	resolve({ totalRows: total_rows, bookmark, rows: transformedRows });
	// 		// });
	// 	});
	// }

	public async getAirports(radius: number, lat: number, lon: number, limit: number): Promise<Airport[]> {
		// Get bounding box
		const [[minLat, minLon], [maxLat, maxLon]] = this.getBoundingBox(lat, lon, radius);

		// Prepare filter
		const query = `lon:[${minLon} TO ${maxLon}] AND lat:[${minLat} TO ${maxLat}]`;

		// Collect all airports that match query
		let airports: Airport[] = [];
		let rows: any[];
		let bookmark: string;
		do {
			const result = await this.getAirportBatch(query, bookmark);
			rows = result.rows;
			bookmark = result.bookmark;

			// Filter result to airports within the circle
			const transformedRows = rows
				.filter((row) => this.getDistance(lat, lon, (row.fields as any).lat, (row.fields as any).lon) <= radius)
				.map((row) => ({ id: row.id, ...row.fields } as Airport));

			// Add to collected airports
			airports = airports.concat(transformedRows);
		} while (rows.length > 0);

		// Order airports by distance
		airports = orderBy(airports, (a: Airport) => this.getDistance(lat, lon, a.lat, a.lon));

		// Take the first `limit` airport
		airports = take(airports, limit);

		return airports;
	}

	private async getAirportBatch(
		query: string,
		bookmark?: string,
	): Promise<nano.DocumentSearchResponse<any>> {
		return new Promise((resolve, reject) => {
			// Prepare query params
			const params: { q: string; limit: number; bookmark?: string } = {
				q: query,
				limit: 200,
			};
			if (bookmark) { params.bookmark = bookmark; }

			// Run search
			this.db.search('view1', 'geo', params, (err, result) => {
				if (err) { reject(err); }

				console.log('Showing %d out of a total %d airports', result.rows.length, result.total_rows);
				resolve(result);
			});
		});
	}

	// Sources:
	// http://janmatuschek.de/LatitudeLongitudeBoundingCoordinates
	// https://www.movable-type.co.uk/scripts/latlong-vincenty.html#direct
	// https://www.sitepoint.com/community/t/adding-distance-to-gps-coordinates-to-get-bounding-box/5820/10
	private getBoundingBox(lat: number, lon: number, radius: number) {
		const latRad = this.toRadians(lat);
		const lonRad = this.toRadians(lon);

		const distRad = radius / EARTH_RADIUS;

		let minLatRad = latRad - distRad;
		let maxLatRad = latRad + distRad;
		let minLonRad: number;
		let maxLonRad: number;

		if (minLatRad > MIN_LAT && maxLatRad < MAX_LAT) {
			const deltaLon = Math.asin(
				Math.sin(distRad) / Math.cos(latRad)
			);
			minLonRad = lonRad - deltaLon;
			if (minLonRad < MIN_LON) { minLonRad += 2 * Math.PI; }
			maxLonRad = lonRad + deltaLon;
			if (maxLonRad > MAX_LON) { maxLonRad -= 2 * Math.PI; }
		} else {
			minLatRad = Math.max(minLatRad, MIN_LAT);
			maxLatRad = Math.min(maxLatRad, MAX_LAT);
			minLonRad = MIN_LON;
			maxLonRad = MAX_LON;
		}

		const minLat = this.toDegrees(minLatRad);
		const maxLat = this.toDegrees(maxLatRad);
		const minLon = this.toDegrees(minLonRad);
		const maxLon = this.toDegrees(maxLonRad);

		return [[minLat, minLon], [maxLat, maxLon]];
	}

	// Haversine formula
	// Source: https://www.movable-type.co.uk/scripts/latlong.html
	private getDistance(lat1: number, lon1: number, lat2: number, lon2: number) {
		const latRad1 = this.toRadians(lat1);
		const latRad2 = this.toRadians(lat2);
		const deltaLat = this.toRadians(lat2 - lat1);
		const deltaLon = this.toRadians(lon2 - lon1);

		const a = Math.sin(deltaLat / 2) * Math.sin(deltaLat / 2) +
			Math.cos(latRad1) * Math.cos(latRad2) *
			Math.sin(deltaLon / 2) * Math.sin(deltaLon / 2);
		const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

		const dist = EARTH_RADIUS * c;
		return dist;
	}

	private toRadians(degrees: number) {
		return degrees * (Math.PI / 180);
	}

	private toDegrees(radians: number) {
		return radians * (180 / Math.PI);
	}

}
