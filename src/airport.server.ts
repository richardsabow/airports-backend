import cloudant from '@cloudant/cloudant';
import bodyParser from 'body-parser';
import cors from 'cors';
import express from 'express';
import helmet from 'helmet';
import { Server } from 'http';
import { Injector, ReflectiveInjector } from 'injection-js';

import { Config } from './config';
import { CONTROLLERS } from './controllers';
import { CLOUDANT, SERVICES } from './services';

export class AirportServer {

	private injector: Injector;
	private app: express.Express;
	private server: Server;

	private cloudant: cloudant.ServerScope;

	constructor(private config: Config) {
		// Init error handling
		this.initErrorHandler();

		// Initialize HTTP
		this.app = express();
		this.app.use(bodyParser.json());
		this.app.use(cors());
		this.app.use(helmet());
	}

	public async start() {
		// Connect cloudant
		console.log('Initializing cloudant...');
		this.cloudant = cloudant(this.config.cloudantUrl);
		console.log('Connected to cloudant.');

		// Initialize DI
		this.injector = ReflectiveInjector.resolveAndCreate([
			...SERVICES,
			...CONTROLLERS,
			{ provide: Config, useValue: this.config },
			{ provide: CLOUDANT, useValue: this.cloudant },
		]);

		// Register controllers
		CONTROLLERS.forEach(
			(controllerClass) => this.injector
				.get(controllerClass)
				.register(this.app),
		);

		// Start HTTP
		this.server = this.app.listen(this.config.httpPort, () => {
			console.log('Server started listening.', { port: this.config.httpPort });
		});
	}

	public stop() {
		console.log('Stopping server...');

		// Stop HTTP
		this.server.close();
	}

	private initErrorHandler() {
		process.on('unhandledRejection', (reason, p) => {
			console.error('Unhandled promise rejection', (reason as any).stack || reason, p);
		})
		.on('uncaughtException', (err) => {
			console.error('Uncaught exception', err);
			process.exit(1);
		});
	}

}
