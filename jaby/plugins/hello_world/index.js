( function () {
	"use strict";

	var nools = require( "nools" );

	var Message = function ( message ) {
		this.text = message;
	};

	var helloWorld = {

		//	`exports.attach` gets called by Broadway on `app.use`
		attach: function ( jaby ) {

			var flow = nools.flow( "Hello World", function ( flow ) {

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

			var session = flow.getSession();

			this.hello = function ( world ) {
				//	Assert your different messages
				session.assert( new Message( "goodbye" ) );
				session.assert( new Message( "hello" ) );
				session.assert( new Message( "hello world" ) );
				session.assert( new Message( world ) );

				session.match();
			};
		},

		//	`exports.init` gets called by Broadway on `app.init`.
		init: function ( done ) {
			return done();
		}

	};

	module.exports = helloWorld;

} ).call( this );
