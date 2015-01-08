( function () {
	"use strict";

	var User = require( "./User" );
	var Message = require( "./Message" );

	var coreRules = {

		name: "Core",

		//	`exports.attach` gets called by Broadway on `app.use`
		attach: function ( jaby ) {

			jaby.objects = {};
			jaby.objects.Message = Message;
			jaby.objects.User = User;

			jaby.loadUser = function ( socket ) {

				var userID = socket && socket.request && socket.request.user ? socket.request.user._id.toString() : undefined;
				var user;

				if ( !userID ) {
					return;
				}

				if ( !this.hasOwnProperty( "users" ) ) {
					this.users = {};
				}

				if ( this.users.hasOwnProperty( userID ) ) {
					user = this.users[ userID ];
				}
				else {
					user = new User( userID, jaby );
					this.users[ userID ] = user;
				}

				if ( user ) {
					user.addSocket( socket.id, jaby );
				}

			};

			jaby.unloadUser = function ( socket ) {

				var userID = socket && socket.request && socket.request.user ? socket.request.user._id.toString() : undefined;
				var user;

				if ( !userID ) {
					return;
				}

				if ( !this.hasOwnProperty( "users" ) ) {
					this.users = {};
				}

				if ( this.users.hasOwnProperty( userID ) ) {

					user = this.users[ userID ];
					user.removeSocket( socket.id );

					if ( !user.isActive() ) {
						delete this.users[ userID ];
					}

				}

			};

			jaby.assert = function ( userID, assertion, match ) {

				var user;

				if ( !userID || typeof userID !== "string" || !assertion ) {
					return;
				}

				if ( !this.users || !this.users.hasOwnProperty( userID ) ) {
					return;
				}
				else {

					try {
						user = this.users[ userID ];

						if ( user.isActive() ) {
							user.session.assert( assertion );

							if ( match ) {
								this.match( userID );
							}
						}
					}
					catch ( e ) {
						console.error( "There was an error adding assertion to rules: %s", e );
					}
				}

			};

			jaby.match = function ( userID ) {

				var user;

				if ( !userID || typeof userID !== "string" ) {
					return;
				}

				if ( !this.users || !this.users.hasOwnProperty( userID ) ) {
					return;
				}
				else {

					try {

						user = this.users[ userID ];

						if ( user.isActive() ) {
							user.session.match();
						}

					}
					catch ( e ) {
						console.error( "There was an error matching rules: %s", e );
					}

				}

			};

		},

		//	`exports.init` gets called by Broadway on `app.init`.
		init: function ( done ) {
			return done();
		}

	};

	module.exports = coreRules;

} ).call( this );
