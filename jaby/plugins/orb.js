( function () {
	"use strict";

	var secrets = require( "../../config/secrets" );
	// var https = require( "https" );
	// var querystring = require( "querystring" );
	var MongoClient = require( "mongodb" ).MongoClient;
	// var google = require( "googleapis" );
	// var OAuth2 = google.auth.OAuth2;
	// var oauth2Client = new OAuth2( secrets.google.clientID, secrets.google.clientSecret, secrets.google.callbackURL );

	var orb = {};

	orb.attach = function ( /* options */) {
		this.registerSocket = function registerSocket( io, socket ) {
			if ( !io || !socket ) {
				return;
			}

			console.log( "Socket connected: %s", socket.handshake.address );

			socket.on( "start", function () {
				var response = {
					message: "Welcome " + ( socket.request.user.logged_in ? socket.request.user.profile.name : "" )
				};

				console.log( "Start %s: %s", socket.handshake.address, socket.request.user.profile.name );

				io.sockets.emit( "reply", response );
			} );

			socket.on( "message", function ( data ) {
				var response = {
					message: "Got the message: " + data.message
				};

				console.log( "From %s: %s", socket.handshake.address, data.message );

				io.sockets.emit( "reply", response );
			} );

			socket.on( "disconnect", function () {
				console.log( "Socket disconnected: %s", socket.handshake.address );
			} );

			socket.on( "status", function ( context ) {
				var now = new Date();
				var response;
				var connectionString;

				// function request( options, cb ) {
				// 	var body = "";
				// 	https
				// 		.get( options, function ( res ) {
				// 			res.on( "data", function ( chunk ) {
				// 				body += chunk;
				// 			} ).on( "error", function ( e ) {
				// 				return cb( e );
				// 			} ).on( "end", function () {
				// 				try {
				// 					cb( null, JSON.parse( body ) );
				// 				}
				// 				catch ( ex ) {
				// 					cb( ex );
				// 				}
				// 			} );
				// 		} )
				// 		.on( "error", function ( e ) {
				// 			return cb( e );
				// 		} );
				// }

				function getTimeZone( position, callback ) {
					// var options = {
					// 	location: position.coords.latitude + "," + position.coords.longitude,
					// 	timestamp: position.timestamp,
					// 	key: "AIzaSyB6UrC7FFDVFzEJ2KOljttSh9LqnBXVORI"
					// };
					// var params = {
					// 	hostname: "maps.googleapis.com",
					// 	port: 443,
					// 	path: "/maps/api/timezone/json?" + querystring.stringify( options )
					// };
					//return request( params, callback );
					callback( null );
				}

				if ( context.hasOwnProperty( "ttl" ) && context.ttl < now ) {
					console.info( "Old status: %s", now - context.ttl );
				}
				else {
					response = {
						message: "online"
					};
					connectionString = secrets.db + "/" + socket.request.user._id.toString();

					MongoClient.connect( connectionString, function ( err, database ) {
						var contextCollection;

						if ( err ) {
							console.error( err );
						}

						if ( database ) {
							contextCollection = database.collection( "context" );
							contextCollection.ensureIndex( {
								"when": 1
							}, {
								expireAfterSeconds: 3600
							}, function ( err ) {
								if ( err ) {
									console.error( err );
								}
								else {
									if ( context ) {
										context.when = new Date();
										contextCollection.save( context, function ( err ) {
											if ( err ) {
												console.error( "Could not save context: %s", err );
											}
											getTimeZone( context.position, function ( err, timezoneData ) {
												if ( err ) {
													console.error( err );
												}
												else {
													if ( timezoneData ) {
														console.info( "Google returned %s", JSON.stringify( timezoneData ) );
														response.timeZoneName = timezoneData.timeZoneName;
													}
												}

												io.sockets.emit( "status", response );

											} );
										} );
									}
								}
							} );
						}
					} );
				}
			} );
		};
	};

	orb.init = function ( done ) {
		return done();
	};

	module.exports = orb;

} ).call( this );