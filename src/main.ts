import 'reflect-metadata';

import { AirportServer } from './airport.server';
import { Config } from './config';

const config = new Config();
const server = new AirportServer(config);

server.start();
