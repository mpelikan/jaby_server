( function () {
	"use strict";

	var nools = require( "nools" );

	var Message = function ( message ) {
		this.text = message;
	};

	var coreRules = {

		name: "Core",

		//	`exports.attach` gets called by Broadway on `app.use`
		attach: function ( jaby ) {

			var flow = nools.compile( __dirname + "/rules/core.nools", {
				define: {
					Message: Message
				},
				scope: {
					logger: jaby.logger
				}
			} );

			this.session = flow.getSession();

			this.hello = function ( world ) {

				//	Assert your different messages
				this.session.assert( new Message( "goodbye" ) );
				this.session.assert( new Message( "hello" ) );
				this.session.assert( new Message( "hello world" ) );
				this.session.assert( new Message( world || "!" ) );

				this.session.match();

			};

		},

		//	`exports.init` gets called by Broadway on `app.init`.
		init: function ( done ) {
			return done();
		}

	};

	module.exports = coreRules;

} ).call( this );
