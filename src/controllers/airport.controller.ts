import * as http from 'advanced-controllers';
import { Injectable } from 'injection-js';

import { AirportService } from '../services';


@Injectable()
@http.Controller('/airports')
export class AirportController extends http.AdvancedController {

	constructor(
		private airportService: AirportService,
	) {
		super();
	}

	/** Lists airports */
	@http.Get('/')
	public async find(
		@http.Query('radius', Number, false) radius: number,
		@http.Query('lat', Number, false) lat: number,
		@http.Query('lon', Number, false) lon: number,
		@http.Query('limit', Number, true) limit: number,
	) {
		// We won't accept a radius larger than 1.000km
		if (radius > 1_000_000) {
			throw new http.WebError('Given radius is too large', 400);
		}

		return await this.airportService.getAirports(radius, lat, lon, limit || 50);
	}

}
