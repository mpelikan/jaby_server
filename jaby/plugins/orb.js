( function () {
	"use strict";

	var secrets = require( "../../config/secrets" );
	// var https = require( "https" );
	// var querystring = require( "querystring" );
	var MongoClient = require( "mongodb" ).MongoClient;
	// var google = require( "googleapis" );
	// var OAuth2 = google.auth.OAuth2;
	// var oauth2Client = new OAuth2( secrets.google.clientID, secrets.google.clientSecret, secrets.google.callbackURL );

	//	As a plug-in, provide init and attach functions
	var orb = {

		attach: function ( /* options */) {

			this.registerSocket = function registerSocket( io, socket ) {

				function generateUUID() {
					/*jslint bitwise: true */

					var d = new Date().getTime();
					var uuid = "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace( /[xy]/g, function ( c ) {
						var r = ( d + Math.random() * 16 ) % 16 | 0;
						d = Math.floor( d / 16 );

						return ( c === "x" ? r : ( r & 0x3 | 0x8 ) ).toString( 16 );
					} );

					return uuid;
				}

				function askQuestion() {
					var id = "question_" + generateUUID();
					var question = "Does the QA function work?";
					var answers = [ {
						id: 123,
						text: "Testing One"
					}, {
						id: 456,
						text: "Testing Two"
					}, {
						id: 789,
						text: "Testing Three"
					} ];

					io.sockets.emit( "question", {
						id: id,
						question: question,
						answers: answers
					} );
				}

				if ( !io || !socket ) {
					return;
				}

				console.log( "Socket connected: %s", socket.handshake.address );

				socket.on( "start", function () {
					var connectionString = secrets.db + "/" + socket.request.user._id.toString();

					MongoClient.connect( connectionString, function ( err, database ) {
						var contextCollection;

						if ( err ) {
							console.error( "%s:\tCould not connect to MongoDB: %s", new Date(), err );
						}

						if ( database ) {
							contextCollection = database.collection( "context" );
							contextCollection.ensureIndex( {
								"when": 1
							}, {
								expireAfterSeconds: 3600
							}, function ( err ) {
								if ( err ) {
									console.error( "%s\tCould not add expiration to context collection: %s", new Date(), err );
								}
								else {
									//	TODO: Anything else to do?
									console.log( "Start %s: %s", socket.handshake.address, socket.request.user.profile.name );

									askQuestion();
								}
							} );
						}
					} );
				} );

				socket.on( "message", function ( data ) {
					var response = {
						message: "Got the message: " + data.message
					};

					console.log( "From %s: %s", socket.handshake.address, data.message );

					io.sockets.emit( "reply", response );
				} );

				socket.on( "answer", function ( data ) {
					console.log( "Received answer \"%s\" from %s: \"%s\"", data.question, socket.handshake.address, data.answer );
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
							message: "online",
							activityLoad: Math.floor( Math.random() * 10 ) + 1
						};
						connectionString = secrets.db + "/" + socket.request.user._id.toString();

						MongoClient.connect( connectionString, function ( err, database ) {
							var contextCollection;

							if ( err ) {
								console.error( "%s:\tCould not connect to MongoDB: %s", new Date(), err );
							}

							if ( database ) {
								contextCollection = database.collection( "context" );
								if ( context ) {
									context.when = new Date();
									contextCollection.save( context, function ( err ) {
										try {
											database.close();
										}
										catch ( e ) {
											console.error( "Could not close database: %s", e );
										}

										if ( err ) {
											console.error( "%s\tCould not save context: %s", new Date(), err );
										}
										getTimeZone( context.position, function ( err, timezoneData ) {
											if ( err ) {
												console.error( "%s\tCould not get timezone: %s", new Date(), err );
											}
											else {
												if ( timezoneData ) {
													console.info( "Google returned %s", JSON.stringify( timezoneData ) );
													response.timeZoneName = timezoneData.timeZoneName;
												}
											}

											console.info( "%s\tStatus ping: %s", new Date(), socket.request.user._id );
											io.sockets.emit( "status", response );
										} );
									} );
								}
							}
						} );
					}
				} );
			};
		},

		init: function ( done ) {
			return done();
		}

	};

	module.exports = orb;

} ).call( this );
