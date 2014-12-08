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

			var flow = nools.flow( "core", function ( flow ) {

				//	Find any message that start with hello
				flow.rule( "Hello", [ Message, "m", "m.text =~ /^hello(\\s*world)?$/" ], function ( facts ) {
					facts.m.text = facts.m.text + " goodbye";
					this.modify( facts.m );
				} );

				//	Find all messages then end in goodbye
				flow.rule( "Goodbye", [ Message, "m", "m.text =~ /.*goodbye$/" ], function ( facts ) {
					jaby.logger.info( facts.m.text );
				} );
			} );

			this.session = flow.getSession();

		},

		hello: function ( world ) {

			//	Assert your different messages
			this.session.assert( new Message( "goodbye" ) );
			this.session.assert( new Message( "hello" ) );
			this.session.assert( new Message( "hello world" ) );
			this.session.assert( new Message( world || "!" ) );

			this.session.match();

		},

		//	`exports.init` gets called by Broadway on `app.init`.
		init: function ( done ) {
			return done();
		}

	};

	module.exports = coreRules;

} ).call( this );
