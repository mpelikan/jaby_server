( function () {
	"use strict";

	var Answer = function ( question, answer ) {

		if ( question && answer ) {
			this.question = question;
			this.answer = answer;
		}

	};

	module.exports = Answer;

} ).call( this );
