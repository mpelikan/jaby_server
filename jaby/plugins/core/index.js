( function () {
	"use strict";

	var nools = require( "nools" );

	var coreRules = {

		name: "Core",

		//	`exports.attach` gets called by Broadway on `app.use`
		attach: function ( jaby ) {

			jaby.Message = function ( message ) {
				this.text = message;
			};

			jaby.loadUser = function ( user ) {

				var flow;

				if ( !user || typeof user !== "string" ) {
					return;
				}

				if ( !this.hasOwnProperty( "users" ) ) {
					this.users = {};
				}

				if ( this.users.hasOwnProperty( user ) ) {

					return this.users[ user ];

				}
				else {

					try {

						flow = nools.compile( __dirname + "/rules/core.nools", {
							name: user,
							define: {
								Message: jaby.Message
							},
							scope: {
								logger: jaby.logger,
								user: user
							}
						} );

					}
					catch ( e ) {
						console.error( "Couldn't compile rules for user: %s", e );
					}

					try {

						if ( flow ) {
							this.users[ user ] = flow.getSession();
						}

					}
					catch ( e ) {
						console.error( "Couldn't get session for user: %s", e );
					}

				}

			};

			jaby.unloadUser = function ( user ) {

				if ( !user || typeof user !== "string" ) {
					return;
				}

				if ( !this.hasOwnProperty( "users" ) ) {
					this.users = {};
				}

				if ( !this.users.hasOwnProperty( user ) ) {
					return;
				}
				else {

					try {
						nools.deleteFlow( user );
					}
					catch ( e ) {
						console.error( "Couldn't delete flow for user: %s", e );
					}

					try {
						delete this.users[ user ];
					}
					catch ( e ) {
						console.error( "Couldn't remove session for user: %s", e );
					}

				}

			};

			jaby.assert = function ( user, assertion, match ) {

				var userSession;

				if ( !user || typeof user !== "string" || !assertion ) {
					return;
				}

				if ( !this.users || !this.users.hasOwnProperty( user ) ) {
					return;
				}
				else {

					try {
						userSession = this.users[ user ];
						userSession.assert( assertion );

						if ( match ) {
							this.match( user );
						}
					}
					catch ( e ) {
						console.error( "There was an error adding assertion to rules: %s", e );
					}
				}

			};

			jaby.match = function ( user ) {

				var userSession;

				if ( !user || typeof user !== "string" ) {
					return;
				}

				if ( !this.users || !this.users.hasOwnProperty( user ) ) {
					return;
				}
				else {

					try {
						userSession = this.users[ user ];
						userSession.match();
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
