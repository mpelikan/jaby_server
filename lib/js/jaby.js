/* jshint browser:true, devel:true */
( function () {
	"use strict";

	var io = require( "socket.io-client" );

	function sendUserMessage() {
		var message = inputMessage.value;

		if ( message && connected ) {
			sendMessage( message );
		}

		inputMessage.value = "";
	}

	function sendMessage( message ) {
		var envelope = {};
		var context = {};

		if ( message && connected ) {
			envelope.context = context;
			envelope.message = message;

			socket.emit( "message", envelope );
		}
	}

	function keydown( event ) {
		if ( !( event.ctrlKey || event.metaKey || event.altKey ) ) {
			inputMessage.focus();
		}
		if ( event.which === 13 ) {
			sendUserMessage();
		}
	}

	function getTextContent( element ) {
		if ( element ) {
			if ( element.textContent && typeof ( element.textContent ) !== "undefined" ) {
				return element.textContent;
			}
			else {
				return element.innerText;
			}
		}
	}

	function addEvent( element, type, eventHandle ) {
		if ( element === null || typeof ( element ) === "undefined" ) {
			return;
		}
		if ( type === null || typeof ( type ) === "undefined" ) {
			return;
		}
		if ( eventHandle === null || typeof ( eventHandle ) === "undefined" ) {
			return;
		}
		if ( element.addEventListener ) {
			element.addEventListener( type, eventHandle, false );
		}
		else {
			if ( element.attachEvent ) {
				element.attachEvent( "on" + type, eventHandle );
			}
			else {
				element[ "on" + type ] = eventHandle;
			}
		}
	}

	function autoSizeText() {
		var elements = document.getElementsByClassName( "resize" );
		var numElements = elements.length;
		var i;
		var element;
		var fontSize;

		for ( i = 0; i < numElements; i++ ) {
			element = elements[ i ];

			if ( getTextContent( element ) ) {
				fontSize = 200;

				do {
					element.style.fontSize = ( fontSize-- ) + "px";
				}
				while ( element.scrollHeight > element.offsetHeight && fontSize >= 12 );
			}
		}
	}

	function showText( text ) {

		function tokenizeString() {
			var theText;
			var reTokens = /\S+\s*/g;
			var stringTokens, len, i;
			var tokenizedText = "";

			if ( progressiveText ) {
				theText = text.replace( /</g, "&lt;" ).replace( />/g, "&gt;" );
				stringTokens = theText.match( reTokens );
				len = stringTokens.length;

				for ( i = 0; i < len; i++ ) {
					theText = stringTokens[ i ];
					theText = theText.replace( /\&lt;b\&gt;/g, "<span style='font-weight: bolder;'>" ).replace( /\&lt;\/b\&gt;/g, "</span>" );
					theText = theText.replace( /\&lt;strong\&gt;/g, "<span style='font-weight: bolder;'>" ).replace( /\&lt;\/strong\&gt;/g, "</span>" );
					theText = theText.replace( /\&lt;big\&gt;/g, "<span style='font-size: 1.17em;'>" ).replace( /\&lt;\/big\&gt;/g, "</span>" );
					theText = theText.replace( /\&lt;small\&gt;/g, "<span style='font-size: 0.83em;'>" ).replace( /\&lt;\/small\&gt;/g, "</span>" );
					theText = theText.replace( /\&lt;sub\&gt;/g, "<span style='vertical-align: sub; font-size: 0.83em;'>" ).replace( /\&lt;\/sub\&gt;/g, "</span>" );
					theText = theText.replace( /\&lt;sup\&gt;/g, "<span style='vertical-align: super; font-size: 0.83em;'>" ).replace( /\&lt;\/sup\&gt;/g, "</span>" );
					theText = theText.replace( /\&lt;var\&gt;/g, "<span style='font-style: italic'>" ).replace( /\&lt;\/var\&gt;/g, "</span>" );
					theText = theText.replace( /\&lt;address\&gt;/g, "<span style='font-style: italic'>" ).replace( /\&lt;\/address\&gt;/g, "</span>" );
					theText = theText.replace( /\&lt;tt\&gt;/g, "<span style='font-family: monospace;'>" ).replace( /\&lt;\/tt\&gt;/g, "</span>" );
					theText = theText.replace( /\&lt;kbd\&gt;/g, "<span style='font-family: monospace;'>" ).replace( /\&lt;\/kbd\&gt;/g, "</span>" );
					theText = theText.replace( /\&lt;samp\&gt;/g, "<span style='font-family: monospace;'>" ).replace( /\&lt;\/samp\&gt;/g, "</span>" );
					theText = theText.replace( /\&lt;code\&gt;/g, "<span style='font-family: monospace;'>" ).replace( /\&lt;\/code\&gt;/g, "</span>" );
					theText = theText.replace( /\&lt;pre\&gt;/g, "<span style='display: inline; font-family: monospace; white-space: pre;'>" ).replace( /\&lt;\/pre\&gt;/g, "</span>" );
					theText = theText.replace( /\&lt;q\&gt;/g, "<q>" ).replace( /\&lt;\/q\&gt;/g, "</q>" );
					theText = theText.replace( /\&lt;i\&gt;/g, "<span style='font-style: italic;'>" ).replace( /\&lt;\/i\&gt;/g, "</span>" );
					theText = theText.replace( /\&lt;em\&gt;/g, "<span style='font-style: italic;'>" ).replace( /\&lt;\/em\&gt;/g, "</span>" );
					theText = theText.replace( /\&lt;cite\&gt;/g, "<span style='font-style: italic;'>" ).replace( /\&lt;\/cite\&gt;/g, "</span>" );
					theText = theText.replace( /\&lt;s\&gt;/g, "<span style='text-decoration: line-through;'>" ).replace( /\&lt;\/s\&gt;/g, "</span>" );
					theText = theText.replace( /\&lt;strike\&gt;/g, "<span style='text-decoration: line-through;'>" ).replace( /\&lt;\/strike\&gt;/g, "</span>" );
					theText = theText.replace( /\&lt;u\&gt;/g, "<span style='text-decoration: underline;'>" ).replace( /\&lt;\/u\&gt;/g, "</span>" );
					theText = theText.replace( /\&lt;ins\&gt;/g, "<span style='text-decoration: underline;'>" ).replace( /\&lt;\/ins\&gt;/g, "</span>" );
					tokenizedText += "<span id='delay" + ( tokens++ ) + "' style='opacity: 0;'>" + theText + "</span>";
				}

				content.innerHTML = tokenizedText;
				autoSizeText();
				setTimeout( showTokens, 10 );
			}
			else {
				content.innerHTML = text;
				autoSizeText();
			}
		}

		function calculatePause( phrase ) {
			switch ( phrase.substr( phrase.length - 1 ) ) {
			case "!":
			case ".":
			case "?":
				return 25;
			case ":":
			case ";":
				return 10;
			default:
				return 0;
			}
		}

		function showTokens() {

			function hasMoreTokens() {
				return ( index < tokens );
			}

			function getNextToken() {

				function calculateThreshold( text ) {
					var ratio = text.length / 12;
					var pause = calculatePause( text );

					if ( pause || ratio > 0.9 ) {
						return 0.9;
					}
					else {
						if ( ratio < 0.3 ) {
							return 0.3;
						}
						else {
							return ratio;
						}
					}
				}

				var element;

				if ( hasMoreTokens() ) {
					element = document.getElementById( "delay" + index++ );

					if ( element ) {
						elements.push( element );
						opacities.push( 0 );
						thresholds.push( calculateThreshold( getTextContent( element ).trim() ) );

						return true;
					}
				}

				return false;
			}

			function removeToken() {
				elements.shift();
				opacities.shift();
				thresholds.shift();
			}

			function showToken() {
				var elementIndex, element, opacity, threshold;
				var pauseTicks = 0;

				if ( elements.length ) {
					for ( elementIndex = 0; elementIndex < elements.length; elementIndex++ ) {
						element = elements[ elementIndex ];
						if ( element ) {
							opacity = opacities[ elementIndex ];
							threshold = thresholds[ elementIndex ];

							opacity += step;
							if ( opacity > 0.99 ) {
								opacity = 1;
							}
							element.style.opacity = opacity;
							opacities[ elementIndex ] = opacity;
						}
					}

					if ( opacity > threshold || opacity === 1 ) {
						if ( getNextToken() ) {
							pauseTicks = calculatePause( getTextContent( element ).trim() );
						}
					}

					if ( elements.length && opacities[ 0 ] === 1 ) {
						removeToken();
					}
				}
				else {
					getNextToken();
				}

				if ( elements.length ) {
					setTimeout( showToken, delayTicks + pauseTicks );
				}
			}

			//var step = 0.005;
			var step = 0.0075;
			var delayTicks = 2;

			var elements = [];
			var opacities = [];
			var thresholds = [];

			showToken();
		}

		var tokens = 0;
		var index = 0;
		var content = document.getElementById( "content" );

		tokenizeString();
	}

	var socket = io();
	var connected = false;
	var progressiveText = true;
	var inputMessage = document.getElementsByClassName( "inputMessage" )[ 0 ];

	socket.on( "connect", function () {
		connected = true;
		socket.emit( "start", {} );
	} );

	socket.on( "reply", function ( reply ) {
		console.log( "Reply: " + JSON.stringify( reply, null, "\t" ) );
		showText( reply.message );
	} );

	window.onload = function () {
		addEvent( window, "resize", autoSizeText );
		addEvent( window, "keydown", keydown );

		inputMessage.focus();
	};

} ).call( this );