( function () {
	"use strict";

	var cuid = require( "cuid" );

	var Question = function ( question, answers ) {

		if ( question && answers && answers.length > 0 ) {
			this.id = "question_" + cuid();
			this.question = question;
			this.answers = answers;
		}

	};

	module.exports = Question;

} ).call( this );
