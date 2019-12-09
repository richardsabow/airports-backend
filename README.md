# World of Airports Backend

This is an http web application written in node.js that pulls data about airports from a Cloudant database. The service accepts a user provided radius and a user provied lat/long point as query parameters. As a result it gives a list of airports (with their locations) which are within the input radius of the input point, sorted by distance.

## Build & Install

To run the application you have to install the dependencies and build the project:

`$ npm install`

`$ npm run build`

## Configuration

To run the application you need to set a few `ENV` variables. In local environment you may use a `.env` file.

The configuration options are as follows:

### Http Configuration

* `HTTP_PORT`: Sets the port on which the server listens

### Database Configuration

The service uses Cloudant database to get airports.

* `CLOUDANT_URL`: Database URL
* `CLOUDANT_DB`: Database name (default: airportdb)


## Running

After you've configured the project you may start it by calling `npm start`.
