import * as dotenv from 'dotenv';
import { Injectable } from 'injection-js';

@Injectable()
export class Config {

	public httpPort: number;
	public cloudantUrl: string;
	public cloudantDb: string;

	constructor() {
		dotenv.config();

		this.httpPort = parseInt(process.env.HTTP_PORT, 10) || 8080;
		this.cloudantUrl = process.env.CLOUDANT_URL;
		if (!this.cloudantUrl) {
			throw new Error('`CLOUDANT_URL` is missing from config, please provide the url of database.');
		}
		this.cloudantDb = process.env.CLOUDANT_DB || 'airportdb';
	}

}
