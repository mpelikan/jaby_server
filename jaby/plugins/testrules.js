( function () {
	"use strict";

	var nools = require( "nools" );

	var Message = function ( message ) {
		this.text = message;
	};

	var testRules = {};

	// `exports.attach` gets called by broadway on `app.use`
	testRules.attach = function ( /* options */) {

		var flow = nools.flow( "Hello World", function ( flow ) {

			//	Find any message that start with hello
			flow.rule( "Hello", [ Message, "m", "m.text =~ /^hello(\\s*world)?$/" ], function ( facts ) {
				facts.m.text = facts.m.text + " goodbye";
				this.modify( facts.m );
			} );

			//	Find all messages then end in goodbye
			flow.rule( "Goodbye", [ Message, "m", "m.text =~ /.*goodbye$/" ], function ( facts ) {
				console.log( facts.m.text );
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
	};

	// `exports.init` gets called by broadway on `app.init`.
	testRules.init = function ( done ) {
		return done();
	};

	module.exports = testRules;

} ).call( this );
