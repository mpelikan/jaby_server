( function () {
	"use strict";

	var usage = require( "usage" );
	var path = require( "path" );
	var secrets = require( path.relative( __dirname, path.join( process.cwd(), "config", "secrets" ) ) );
	var MongoClient = require( "mongodb" ).MongoClient;
	var SuperScript = require( "superscript" );

	//	As a Broadway plug-in, provide init and attach functions
	var orb = {

		name: "Jaby Orb",

		attach: function ( jaby ) {

			var superScriptFile = path.join( __dirname, "data.json" );

			try {
				jaby.superscript = new SuperScript( superScriptFile, {}, function ( err, bot ) {

					if ( err ) {
						jaby.logger.error( "Could not create bot: %s", err );
					}
					else {
						if ( bot ) {
							jaby.bot = bot;
						}
						else {
							jaby.logger.error( "No bot created." );
						}
					}

				} );
			}
			catch ( e ) {

				if ( e.errno === 34 ) {
					jaby.logger.error( "Could not load SuperScript: File does not exist." );
				}
				else {
					jaby.logger.error( "Could not load SuperScript: %s", JSON.stringify( e, null, "\t" ) );
				}

			}

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

				try {
					jaby.loadUser( socket.request.user._id.toString() );
				}
				catch ( e ) {
					console.error( "Could not load user, since no user ID." );
				}

				socket.on( "start", function () {
					var user = socket.request.user && socket.request.user._id ? socket.request.user._id.toString() : undefined;
					var connectionString;

					if ( user ) {

						jaby.assert( user, new jaby.Message( "goodbye" ) );
						jaby.assert( user, new jaby.Message( "hello" ) );
						jaby.assert( user, new jaby.Message( "hello world" ) );
						jaby.assert( user, new jaby.Message( "!" ) );
						jaby.match( user );

						if ( jaby.bot ) {
							jaby.bot.userConnect( user );
						}

						connectionString = secrets.db + "/" + user;

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

										try {
											database.close();
										}
										catch ( e ) {
											jaby.logger.error( "Could not close database: %s", e );
										}

										askQuestion();
									}
								} );
							}
						} );
					}
					else {
						jaby.logger.error( "Could not obtain user from socket." );
					}
				} );

				socket.on( "message", function ( data ) {
					var user = socket.request.user && socket.request.user._id ? socket.request.user._id.toString() : undefined;
					var message = data && data.message ? data.message : null;
					var response = {};

					if ( jaby.bot && user && message ) {

						jaby.bot.reply( user, message, function ( err, reply ) {
							if ( err ) {
								jaby.logger.error( "Bot generated an error: %s", err );
							}
							else {
								if ( reply ) {
									response.message = reply;
									io.sockets.emit( "reply", response );
								}
								else {
									jaby.logger.error( "Bot replied with nothing for %s", message );
								}
							}
						} );
					}
				} );

				socket.on( "answer", function ( data ) {
					jaby.logger.info( "Received answer \"%s\" from %s: \"%s\"", data.question, socket.handshake.address, data.answer );
				} );

				socket.on( "disconnect", function () {
					var user = socket.request.user && socket.request.user._id ? socket.request.user._id.toString() : undefined;

					if ( user ) {
						if ( jaby.bot ) {
							try {
								jaby.bot.userDisconnect( user );
							}
							catch ( exception ) {
								//	Nothing to do, the disconnect couldn't process; probably due to not being registered
							}
						}
						jaby.logger.info( "User disconnected: %s", user );
					}
					else {
						jaby.logger.info( "Socket disconnected: %s", socket.handshake.address );
					}
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
