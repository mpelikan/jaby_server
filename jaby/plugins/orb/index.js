( function () {
	"use strict";

	var usage = require( "usage" );
	var path = require( "path" );
	var secrets = require( path.relative( __dirname, path.join( __dirname, "config", "secrets" ) ) );
	var MongoClient = require( "mongodb" ).MongoClient;

	//	As a Broadway plug-in, provide init and attach functions
	var orb = {

		name: "Jaby Orb",

		attach: function ( jaby ) {

			jaby.registerSocket = function registerSocket( io, socket ) {

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

				jaby.logger.info( "Socket connected: %s", socket.handshake.address );

				socket.on( "start", function () {
					var connectionString = secrets.db + "/" + socket.request.user._id.toString();

					MongoClient.connect( connectionString, function ( err, database ) {
						var contextCollection;

						if ( err ) {
							jaby.logger.error( "%s:\tCould not connect to MongoDB: %s", new Date(), err );
						}

						if ( database ) {
							contextCollection = database.collection( "context" );
							contextCollection.ensureIndex( {
								"when": 1
							}, {
								expireAfterSeconds: 3600
							}, function ( err ) {
								if ( err ) {
									jaby.logger.error( "%s\tCould not add expiration to context collection: %s", new Date(), err );
								}
								else {
									jaby.logger.info( "Start %s: %s", socket.handshake.address, socket.request.user.profile.name );

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

					jaby.logger.info( "From %s: %s", socket.handshake.address, data.message );

					io.sockets.emit( "reply", response );
				} );

				socket.on( "answer", function ( data ) {
					jaby.logger.info( "Received answer \"%s\" from %s: \"%s\"", data.question, socket.handshake.address, data.answer );
				} );

				socket.on( "disconnect", function () {
					jaby.logger.info( "Socket disconnected: %s", socket.handshake.address );
				} );

				socket.on( "status", function ( context ) {
					var now = new Date();
					var response;
					var connectionString;
					var pid = process.pid;
					var options = {
						keepHistory: true
					};

					if ( context.hasOwnProperty( "ttl" ) && context.ttl < now ) {
						return;
					}
					else {
						response = {
							message: "online"
						};

						usage.lookup( pid, options, function ( err, result ) {
							if ( err ) {
								jaby.logger.error( "Could not get machine usage: %s", err );
							}
							else {
								if ( result ) {
									response.usage = result;
								}
							}

							connectionString = secrets.db + "/" + socket.request.user._id.toString();

							MongoClient.connect( connectionString, function ( err, database ) {
								var contextCollection;

								if ( err ) {
									jaby.logger.error( "%s:\tCould not connect to MongoDB: %s", new Date(), err );
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
												jaby.logger.error( "Could not close database: %s", e );
											}

											if ( err ) {
												jaby.logger.error( "%s\tCould not save context: %s", new Date(), err );
											}

											jaby.logger.info( "%s\t%s: %s", new Date(), socket.request.user._id, JSON.stringify( response ) );
											io.sockets.emit( "status", response );
										} );
									}
								}
							} );
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
