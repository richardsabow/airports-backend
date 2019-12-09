import { AdvancedController } from 'advanced-controllers';

import { AirportController } from './airport.controller';

export * from './airport.controller';

export interface AdvancedControllerType {
	new(...params: any[]): AdvancedController;
}

export const CONTROLLERS: AdvancedControllerType[] = [
	AirportController,
];

