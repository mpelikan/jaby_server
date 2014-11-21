/* jshint browser:true, devel:true */
/*global define */
( function ( window, document, exportName, undefined ) {
	"use strict";

	var io = require( "socket.io-client" );
	var Hammer = require( "hammer.js" );

	var TYPE_FUNCTION = "function";

	var jaby = {
		version: "0.1.0",
		connected: false,
		on: false,
		online: true,
		error: false,
		warning: false,
		lastStatus: null,
		waitStatus: 10 * 1000,
		waitStatusBeforeWarning: 15 * 1000,
		waitStatusBeforeOffline: 30 * 1000,
		progressiveText: true,
		rotateStep: 1,
		rotateDeg: 0,
		core_radius: 0,
		pulseMax: 15,
		pulseDirection: 1,
		pulse: 0
	};

	jaby.showText = function showText( text ) {

		function tokenizeString() {
			var theText;
			var reTokens = /\S+\s*/g;
			var stringTokens, len, i;
			var tokenizedText = "";

			if ( self.progressiveText ) {
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

				self.content.innerHTML = tokenizedText;
				self.autoSizeText();
				setTimeout( showTokens, 10 );
			}
			else {
				self.content.innerHTML = text;
				self.autoSizeText();
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
						thresholds.push( calculateThreshold( self.getTextContent( element ).trim() ) );

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
							pauseTicks = calculatePause( self.getTextContent( element ).trim() );
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

			var step = 0.0075;
			var delayTicks = 2;

			var elements = [];
			var opacities = [];
			var thresholds = [];

			showToken();
		}

		var self = this;
		var tokens = 0;
		var index = 0;

		if ( text ) {
			self.showMessageBanner();
			tokenizeString();
		}
	};

	jaby.keydown = function keydown( event ) {
		if ( this.isMessageMode() ) {
			if ( event.which === 27 ) {
				this.hideMessageBanner();
			}
		}
		if ( this.isInputMode() ) {
			if ( !( event.ctrlKey || event.metaKey || event.altKey ) ) {
				this.inputMessage.focus();
			}
			if ( event.which === 13 ) {
				this.sendUserMessage();
			}
			if ( event.which === 27 ) {
				this.hideInputMessage();
			}
		}
	};

	jaby.getTextContent = function getTextContent( element ) {
		if ( element ) {
			if ( element.textContent && typeof ( element.textContent ) !== "undefined" ) {
				return element.textContent;
			}
			else {
				return element.innerText;
			}
		}
	};

	jaby.addEvent = function addEvent( element, type, eventHandle ) {
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
	};

	jaby.autoSizeText = function autoSizeText() {
		var elements = document.getElementsByClassName( "resize" );
		var numElements = elements.length;
		var i;
		var element;
		var fontSize;

		for ( i = 0; i < numElements; i++ ) {
			element = elements[ i ];

			if ( this.getTextContent( element ) ) {
				fontSize = 200;

				do {
					element.style.fontSize = ( fontSize-- ) + "px";
				}
				while ( element.scrollHeight > element.offsetHeight && fontSize >= 12 );
			}
		}
	};

	jaby.onStatus = function onStatus( data ) {
		if ( data && data.message ) {
			this.lastStatus = new Date();
			this.setStatus( data.message );
			// console.info( data.timeZoneName ? data.timeZoneName : "no timezone data" );
		}
	};

	jaby.pulseCore = function pulseCore() {
		this.pulse = this.pulse + this.pulseDirection;
		this.inner_core.setAttribute( "r", this.core_radius + this.pulse );
		this.inner_power.setAttribute( "r", this.core_radius + this.pulse );

		if ( this.pulse >= this.pulseMax || this.pulse <= 0 ) {
			this.pulseDirection *= -1;
		}
	};

	jaby.rotateSphere = function rotateSphere() {
		this.rotateDeg = ( this.rotateDeg + this.rotateStep ) % 360;
		this.rotated_sphere.setAttribute( "transform", "rotate( " + this.rotateDeg + ", 350, 350 )" );
	};

	jaby.animate = function animate() {
		if ( this.on ) {
			this.pulseCore();
			this.rotateSphere();

			if ( this.raised < 1 ) {
				this.raised += 0.1;
				this.raiseOrb();
			}
		}
		else {
			if ( this.raised > 0 ) {
				this.raised -= 0.1;
				this.raiseOrb();
			}
		}
	};

	jaby.raiseOrb = function raiseOrb() {
		var raiseBy, radiusRatio;

		if ( this.raised > 0.99 ) {
			this.raised = 1;
		}
		if ( this.raised < 0.01 ) {
			this.raised = 0;
		}

		raiseBy = this.raisedHeight - ( this.raised * this.raisedHeight );
		this.sphere.setAttribute( "transform", "translate( 0 " + raiseBy + " )" );

		radiusRatio = 1 + ( ( 1 - this.raised ) * 0.2 );
		this.shadow.setAttribute( "rx", radiusRatio * this.shadowRadiusX );
		this.shadow.setAttribute( "ry", radiusRatio * this.shadowRadiusY );

		if ( this.off && this.raised === 0 ) {
			this.turnOffAnimation();
		}
	};

	jaby.turnOnAnimation = function turnOnAnimation() {
		var self = this;

		if ( !this.animationTimer ) {
			this.animationTimer = setInterval( function () {
				self.animate();
			}, 100 );
		}
	};

	jaby.turnOffAnimation = function turnOffAnimation() {
		if ( this.animationTimer ) {
			clearInterval( this.animationTimer );
			delete( this.animationTimer );
		}
	};

	jaby.turnOnPolling = function turnOnPolling() {
		var self = this;

		self.status();

		if ( !this.pollingTimer ) {
			this.pollingTimer = setInterval( function () {
				self.status();
			}, 10000 );
		}
	};

	jaby.turnOffPolling = function turnOffPolling() {
		if ( this.pollingTimer ) {
			clearInterval( this.pollingTimer );
			delete( this.pollingTimer );
		}
	};

	jaby.setCoreColor = function setCoreColor( color ) {
		var i;
		var numStops = this.stops.length;

		for ( i = 0; i < numStops; i++ ) {
			this.stops[ i ].setAttribute( "stop-color", color );
		}
	};

	jaby.setPowerColor = function setInnerColor( color ) {
		this.inner_power.setAttribute( "fill", color );
	};

	jaby.setOrbColor = function animate() {
		if ( this.on ) {
			this.setPowerColor( "#ff0" );

			if ( this.online ) {
				if ( this.error ) {
					this.setCoreColor( "#900" );
				}
				else {
					if ( this.warning ) {
						this.setCoreColor( "#960" );
					}
					else {
						if ( this.notification ) {
							this.setCoreColor( "#009" );
						}
						else {
							this.setCoreColor( "#090" );
						}
					}
				}
			}
			else {
				this.setCoreColor( "#666" );
			}
		}
		else {
			this.setPowerColor( "#fff" );
			this.setCoreColor( "#000" );
		}
	};

	jaby.toggleOnOff = function toggleOnOff() {
		if ( this.on ) {
			this.turnOff();
		}
		else {
			this.turnOn();
		}
	};

	jaby.turnOn = function turnOn() {
		this.on = true;

		this.setOrbColor();

		this.turnOnAnimation();
		this.turnOnPolling();

		this.connected = true;
	};

	jaby.turnOff = function turnOff() {
		this.on = false;

		this.setOrbColor();

		this.turnOffAnimation();
		this.turnOffPolling();

		this.connected = true;
	};

	jaby.setOnline = function setOnline() {
		this.online = true;
		this.setOrbColor();
	};

	jaby.clearOnline = function clearOnline() {
		this.online = false;
		this.setOrbColor();
	};

	jaby.setOffline = function setOffline() {
		this.clearOnline();
	};

	jaby.setError = function setError() {
		this.error = true;
		this.setOrbColor();
	};

	jaby.clearError = function clearError() {
		this.error = false;
		this.setOrbColor();
	};

	jaby.setWarning = function setWarning() {
		this.warning = true;
		this.setOrbColor();
	};

	jaby.clearWarning = function clearWarning() {
		this.warning = false;
		this.setOrbColor();
	};

	jaby.setNotification = function setNotification() {
		this.notification = true;
		this.setOrbColor();
	};

	jaby.clearNotification = function clearNotification() {
		this.notification = false;
		this.setOrbColor();
	};

	jaby.initialize = function initialize() {
		this.setupDOM();
		this.setupEvents();

		this.raised = 0;
		this.raiseOrb();

		this.online = false;
		this.error = false;
		this.warning = false;

		this.turnOff();

		this.setupSocketIO();
		this.setupTouch();
	};

	jaby.status = function status() {

		function doStatus() {
			var diffTime;

			context.dateTime = new Date();
			context.ttl = context.dateTime.getTime() + 10000;

			if ( !self.lastStatus ) {
				self.lastStatus = context.dateTime;
			}

			diffTime = context.dateTime - self.lastStatus;

			if ( self.lastStatus ) {
				if ( diffTime > self.waitStatusBeforeOffline ) {
					self.setOffline();
				}
				else {
					if ( diffTime > self.waitStatusBeforeWarning ) {
						self.setWarning();
					}
				}
			}

			self.socket.emit( "status", context );
		}

		var self = this;
		var context = {};

		if ( "geolocation" in navigator ) {
			navigator.geolocation.getCurrentPosition( function ( position ) {
				context.position = position;

				doStatus();
			} );
		}
		else {
			doStatus();
		}
	};

	jaby.setStatus = function setStatus( status ) {
		switch ( status ) {
			case "online":
				this.setOnline();
				this.clearWarning();
				this.clearError();
				break;
			case "offline":
				this.setOffline();
				break;
			default:
				this.turnOff();
		}
	};

	jaby.sendUserMessage = function sendUserMessage() {
		var message = this.inputMessage.value;

		if ( message && this.connected ) {
			this.sendMessage( message );
		}

		this.clearInputMode();
		this.hideInputMessage();
	};

	jaby.sendMessage = function sendMessage( message ) {
		var envelope = {};
		var context = {};

		if ( message && this.connected ) {
			envelope.context = context;
			envelope.message = message;

			this.socket.emit( "message", envelope );
		}
	};

	jaby.toggleInputMessage = function toggleInputMessage() {
		if ( this.isInputMode() ) {
			this.hideInputMessage();
		}
		else {
			this.showInputMessage();
		}
	};

	jaby.isInputMode = function isInputMode() {
		return this.inputMessage.style.display === "block";
	};

	jaby.clearInputMode = function clearInputMode() {
		this.inputMessage.value = "";
	};

	jaby.showInputMessage = function showInputMessage() {
		this.inputMessage.style.display = "block";
		this.inputMessage.focus();
	};

	jaby.hideInputMessage = function hideInputMessage() {
		this.inputMessage.style.display = "none";
	};

	jaby.isMessageMode = function isMessageMode() {
		return this.content.style.top === "10%" || this.content.style.left === "10%";
	};

	jaby.hideMessageBanner = function hideMessageBanner( direction ) {
		switch ( direction ) {
			case "tap":
			case "panup":
			case "swipeup":
				this.content.style.left = "10%";
				this.content.style.top = "-80%";
				this.content.classList.add( "vertical_message" );
				this.content.classList.remove( "horizontal_message" );
				break;
			case "pandown":
			case "swipedown":
				this.content.style.left = "10%";
				this.content.style.top = "110%";
				this.content.classList.add( "vertical_message" );
				this.content.classList.remove( "horizontal_message" );
				break;
			case "panright":
			case "swiperight":
				this.content.style.left = "110%";
				this.content.style.top = "10%";
				this.content.classList.remove( "vertical_message" );
				this.content.classList.add( "horizontal_message" );
				break;
			case "panleft":
			case "swipeleft":
				/* falls through */
			default:
				this.content.style.left = "-80%";
				this.content.style.top = "10%";
				this.content.classList.remove( "vertical_message" );
				this.content.classList.add( "horizontal_message" );
		}
		this.content.classList.remove( "show_message" );
	};

	jaby.showMessageBanner = function showMessageBanner() {
		this.content.classList.add( "show_message" );
	};

	jaby.setupDOM = function setupDOM() {
		var height;
		var sphereHeight;

		this.orb = document.getElementById( "orb" );
		this.rotated_sphere = document.getElementById( "sphere_holes" );
		this.inner_core = document.getElementById( "inner_core" );
		this.inner_power = document.getElementById( "inner_power" );
		this.shadow = document.getElementById( "sphere_shadow" );
		this.sphere = document.getElementById( "jaby_sphere" );
		this.stops = document.getElementsByClassName( "core_color" );
		this.core_radius = parseInt( this.inner_core.getAttribute( "r" ), 10 );
		this.inputMessage = document.getElementById( "inputMessage" );
		this.content = document.getElementById( "content" );

		this.shadowRadiusY = parseFloat( this.shadow.getAttribute( "ry" ) );
		this.shadowRadiusX = parseFloat( this.shadow.getAttribute( "rx" ) );

		height = parseFloat( this.orb.getAttribute( "height" ) );
		sphereHeight = parseFloat( this.orb.getAttribute( "width" ) );

		this.raisedHeight = height - sphereHeight - this.shadowRadiusY;

		this.showInputMessage();
	};

	jaby.setupEvents = function setupEvents() {
		var self = this;

		this.addEvent( window, "resize", function () {
			self.autoSizeText.apply( self, arguments );
		} );
		this.addEvent( window, "keydown", function () {
			self.keydown.apply( self, arguments );
		} );
	};

	jaby.setupSocketIO = function setupSocketIO() {
		var self = this;

		this.socket = io();

		this.socket.on( "connect", function () {
			self.turnOn.apply( self );
		} );

		this.socket.on( "disconnect", function () {
			self.turnOff.apply( self );
		} );

		this.socket.on( "reply", function ( reply ) {
			self.showText.call( self, reply.message );
		} );

		this.socket.on( "status", function ( status ) {
			self.onStatus.call( self, status );
		} );

		this.socket.emit( "start" );
	};

	jaby.setupTouch = function touch() {
		var self = this;
		var hammer;

		if ( this.orb ) {
			hammer = new Hammer( this.orb );

			hammer.on( "tap", function () {
				self.toggleInputMessage.call( self );
			} );
		}

		if ( this.content ) {
			this.hideMessageBanner( "panleft" );
			this.content.style.display = "block";

			hammer = new Hammer( this.content );

			//	Let the pan gesture support all directions.
			//	This will block the vertical scrolling on a touch-device while on the element
			hammer.get( "pan" ).set( {
				direction: Hammer.DIRECTION_ALL
			} );
			hammer.get( "swipe" ).set( {
				direction: Hammer.DIRECTION_ALL
			} );

			//	Listen to events...
			hammer.on( "panleft panright panup pandown swipeleft swiperight swipeup swipedown tap", function ( ev ) {
				self.hideMessageBanner.call( self, ev.type );
			} );
		}

		if ( this.inputMessage ) {
			this.hideInputMessage( "panup" );

			hammer = new Hammer( this.inputMessage );

			//	Let the pan gesture support all directions.
			//	This will block the vertical scrolling on a touch-device while on the element
			hammer.get( "pan" ).set( {
				direction: Hammer.DIRECTION_ALL
			} );
			hammer.get( "swipe" ).set( {
				direction: Hammer.DIRECTION_ALL
			} );

			//	Listen to events...
			hammer.on( "panleft panright panup pandown swipeleft swiperight swipeup swipedown", function ( ev ) {
				self.hideInputMessage.call( self, ev.type );
			} );
		}
	};

	if ( typeof define === TYPE_FUNCTION && define.amd ) {
		define( function () {
			return jaby;
		} );
	}
	else {
		if ( typeof module !== "undefined" && module.exports ) {
			module.exports = jaby;
		}
		if ( window ) {
			window[ exportName ] = jaby;
		}
	}

} )( window, document, "jabyObj" );