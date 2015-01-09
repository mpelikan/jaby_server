/* jshint browser:true, devel:true */
/* global io, visibly, Hammer */
( function ( window, document, exportName ) {
	"use strict";

	var jaby = {
		version: "0.1.0",
		loaded: false,
		dom: {},
		scale: 1,
		features: {},
		margin: 0.1,
		minScale: 0.2,
		maxScale: 1.0,
		isMobileDevice: false,
		lastMouseWheelStep: 0,
		eventsAreBound: false,
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
		pulse: {
			direction: 1,
			rate: 1,
			rateGoal: 1,
			radius: 0,
			maxRadius: 15
		},
		waitMessageBeforeDeleting: 10 * 1000
	};

	var MESSAGES_SELECTOR = ".messenger .messages > section";

	jaby.setupMessaging = function setupMessaging() {

		this.features.transforms3d = "WebkitPerspective" in document.body.style ||
			"MozPerspective" in document.body.style ||
			"msPerspective" in document.body.style ||
			"OPerspective" in document.body.style ||
			"perspective" in document.body.style;

		this.features.transforms2d = "WebkitTransform" in document.body.style ||
			"MozTransform" in document.body.style ||
			"msTransform" in document.body.style ||
			"OTransform" in document.body.style ||
			"transform" in document.body.style;

		this.features.requestAnimationFrameMethod = window.requestAnimationFrame || window.webkitRequestAnimationFrame || window.mozRequestAnimationFrame;
		this.features.requestAnimationFrame = typeof this.features.requestAnimationFrameMethod === "function";

		this.features.canvas = !!document.createElement( "canvas" ).getContext;

		this.isMobileDevice = navigator.userAgent.match( /(iphone|ipod|android)/gi ) || false;

		if ( !this.features.transforms2d && !this.features.transforms3d ) {
			document.body.setAttribute( "class", "no-transforms" );

			//	If the browser doesn't support core features we won't be using JavaScript to control the messages.
			//	However, this is the least of our worries, if that is the case.
			return;
		}

		this.addEventListeners();

		//	Force a layout when the whole page, incl fonts, has loaded
		window.addEventListener( "load", this.layout.bind( this ), false );

		//	Hide the address bar in mobile browsers
		this.hideAddressBar();

		this.start();

	};

	jaby.start = function start() {

		var self = this;

		//	Updates the messages to match the current configuration values
		this.dom.wrapper.classList.add( "default" );
		this.dom.wrapper.classList.add( "center" );

		this.dom.wrapper.setAttribute( "data-transition-speed", "default" );

		this.layout();

		this.toArray( document.querySelectorAll( MESSAGES_SELECTOR ) ).forEach( function ( slide ) {
			slide.classList.add( "future" );
		} );

		this.showNextMessage();

		//	Notify listeners that the messages is ready but use a 1ms
		//	timeout to ensure it's not fired synchronously after #initialize()
		setTimeout( function () {
			//	Enable transitions now that we're loaded
			self.dom.messages.classList.remove( "no-transition" );

			self.loaded = true;

			self.dispatchEvent( "ready", {
				"currentMessage": self.currentMessage
			} );
		}, 1 );

	};

	jaby.addEventListeners = function addEventListeners() {

		var visibilityChange;

		window.addEventListener( "resize", this.onWindowResize.bind( this ), false );

		document.addEventListener( "keydown", this.onDocumentKeyDown.bind( this ), false );

		this.messagesTouch = new Hammer( this.dom.messages );
		this.messagesTouch.get( "swipe" ).set( {
			direction: Hammer.DIRECTION_ALL
		} );
		this.messagesTouch.on( "swipeleft swiperight swipeup swipedown", this.onTouch.bind( this ) );

		if ( "hidden" in document ) {
			visibilityChange = "visibilitychange";
		}
		else {
			if ( "msHidden" in document ) {
				visibilityChange = "msvisibilitychange";
			}
			else {
				if ( "webkitHidden" in document ) {
					visibilityChange = "webkitvisibilitychange";
				}
			}
		}

		if ( visibilityChange ) {
			document.addEventListener( visibilityChange, this.onPageVisibilityChange.bind( this ), false );
		}

		this.eventsAreBound = true;

	};

	jaby.extend = function extend( a, b ) {

		var property;

		for ( property in b ) {
			if ( b.hasOwnProperty( property ) ) {
				try {
					//	Property in destination object set; update its value.
					if ( b[ property ].constructor === Object ) {
						a[ property ] = extend( a[ property ], b[ property ] );
					}
					else {
						a[ property ] = b[ property ];
					}

				}
				catch ( e ) {
					//	Property in destination object not set; create it and set its value.
					a[ property ] = b[ property ];
				}
			}
		}

		return a;

	};

	jaby.toArray = function toArray( o ) {

		return Array.prototype.slice.call( o );

	};

	jaby.distanceBetween = function distanceBetween( a, b ) {

		var dx = a.x - b.x;
		var dy = a.y - b.y;

		return Math.sqrt( ( dx * dx ) + ( dy * dy ) );

	};

	jaby.transformElement = function transformElement( element, transform ) {

		element.style.WebkitTransform = transform;
		element.style.MozTransform = transform;
		element.style.msTransform = transform;
		element.style.OTransform = transform;
		element.style.transform = transform;

	};

	jaby.getAbsoluteHeight = function getAbsoluteHeight( element ) {

		var height = 0;
		var absoluteChildren = 0;

		if ( element ) {

			this.toArray( element.childNodes ).forEach( function ( child ) {

				if ( typeof child.offsetTop === "number" && child.style ) {

					//	Count # of abs children
					if ( child.style.position === "absolute" ) {
						absoluteChildren += 1;
					}

					height = Math.max( height, child.offsetTop + child.offsetHeight );

				}

			} );

			//	If there are no absolute children, use offsetHeight
			if ( absoluteChildren === 0 ) {

				height = element.offsetHeight;

			}

		}

		return height;

	};

	jaby.getRemainingHeight = function getRemainingHeight( element, height ) {

		var parent, siblings;
		var elementStyles;
		var styles;
		var marginTop, marginBottom;

		height = height || 0;

		if ( element ) {

			parent = element.parentNode;
			siblings = parent.childNodes;

			//	Subtract the height of each sibling
			this.toArray( siblings ).forEach( function ( sibling ) {

				if ( typeof sibling.offsetHeight === "number" && sibling !== element ) {

					styles = window.getComputedStyle( sibling );
					marginTop = parseInt( styles.marginTop, 10 );
					marginBottom = parseInt( styles.marginBottom, 10 );

					height -= sibling.offsetHeight + marginTop + marginBottom;

				}

			} );

			elementStyles = window.getComputedStyle( element );

			//	Subtract the margins of the target element
			height -= parseInt( elementStyles.marginTop, 10 ) + parseInt( elementStyles.marginBottom, 10 );

		}

		return height;

	};

	jaby.hideAddressBar = function hideAddressBar() {

		if ( this.isMobileDevice ) {

			//	Events that should trigger the address bar to hide
			window.addEventListener( "load", this.removeAddressBar.bind( this ), false );
			window.addEventListener( "orientationchange", this.removeAddressBar.bind( this ), false );

		}

	};

	jaby.removeAddressBar = function removeAddressBar() {

		setTimeout( function () {
			window.scrollTo( 0, 1 );
		}, 10 );

	};

	jaby.dispatchEvent = function dispatchEvent( type, properties ) {

		var event = document.createEvent( "HTMLEvents", 1, 2 );

		event.initEvent( type, true, true );
		this.extend( event, properties );
		this.dom.wrapper.dispatchEvent( event );

	};

	jaby.layout = function layout() {

		var messages, message;
		var i, len;

		//	Dimensions of the content
		var messageWidth = "100%";
		var messageHeight = "100%";
		var messagePadding = 20; //	TODO Dig this out of DOM

		var availableWidth;
		var availableHeight;

		if ( this.dom.wrapper ) {

			//	Available space to scale within
			availableWidth = this.dom.wrapper.offsetWidth;
			availableHeight = this.dom.wrapper.offsetHeight;

			//	Reduce available space by margin
			availableWidth -= ( availableHeight * this.margin );
			availableHeight -= ( availableHeight * this.margin );

			//	Layout the contents of the messages
			this.layoutMessageContents( "100%", "100%", messagePadding );

			//	Message width may be a percentage of available width
			if ( typeof messageWidth === "string" && /%$/.test( messageWidth ) ) {
				messageWidth = parseInt( messageWidth, 10 ) / 100 * availableWidth;
			}

			//	Message height may be a percentage of available height
			if ( typeof messageHeight === "string" && /%$/.test( messageHeight ) ) {
				messageHeight = parseInt( messageHeight, 10 ) / 100 * availableHeight;
			}

			this.dom.messages.style.width = messageWidth + "px";
			this.dom.messages.style.height = messageHeight + "px";

			//	Determine scale of content to fit within available space
			this.scale = Math.min( availableWidth / messageWidth, availableHeight / messageHeight );

			//	Respect max/min scale settings
			this.scale = Math.max( this.scale, this.minScale );
			this.scale = Math.min( this.scale, this.maxScale );

			//	Prefer applying scale via zoom since Chrome blurs scaled content with nested transforms
			if ( typeof this.dom.messages.style.zoom !== "undefined" && !navigator.userAgent.match( /(iphone|ipod|ipad|android)/gi ) ) {
				this.dom.messages.style.zoom = this.scale;
			}
			//	Apply scale transform as a fallback
			else {
				this.transformElement( this.dom.messages, "translate(-50%, -50%) scale(" + this.scale + ") translate(50%, 50%)" );
			}

			//	Select all messages
			messages = this.toArray( document.querySelectorAll( MESSAGES_SELECTOR ) );
			len = messages.length;

			for ( i = 0; i < len; i++ ) {
				message = messages[ i ];

				//	Don't bother updating invisible messages
				if ( message.style.display === "none" ) {
					continue;
				}

				message.style.top = Math.max( -( this.getAbsoluteHeight( message ) / 2 ) - messagePadding, -messageHeight / 2 ) + "px";

			}

		}

	};

	jaby.layoutMessageContents = function layoutMessageContents( width, height, padding ) {

		var remainingHeight;
		var nw, nh;
		var es;

		//	Handle sizing of elements with the "stretch" class
		this.toArray( this.dom.messages.querySelectorAll( "section > .stretch" ) ).forEach( function ( element ) {

			//	Determine how much vertical space we can use
			remainingHeight = this.getRemainingHeight( element, ( height - ( padding * 2 ) ) );

			//	Consider the aspect ratio of media elements
			if ( /(img|video)/gi.test( element.nodeName ) ) {
				nw = element.naturalWidth || element.videoWidth;
				nh = element.naturalHeight || element.videoHeight;
				es = Math.min( width / nw, remainingHeight / nh );

				element.style.width = ( nw * es ) + "px";
				element.style.height = ( nh * es ) + "px";

			}
			else {
				element.style.width = width + "px";
				element.style.height = remainingHeight + "px";
			}

		} );

	};

	jaby.showNextMessage = function showNextMessage() {

		var eventObject = {};
		var previousMessage = this.currentMessage || null;
		var currentMessage = previousMessage ? previousMessage.nextElementSibling : this.dom.messages.querySelector( "section.future" );

		if ( previousMessage ) {
			previousMessage.classList.remove( "present" );
			previousMessage.classList.add( "past" );
			eventObject.previousMessage = previousMessage;
		}
		if ( currentMessage ) {
			currentMessage.classList.remove( "future" );
			currentMessage.classList.add( "present" );
			eventObject.currentMessage = currentMessage;
		}

		this.currentMessage = currentMessage;

		this.layout();

		this.dispatchEvent( "messagechanged", eventObject );

	};

	jaby.pop = function pop() {

		if ( this.currentMessage ) {
			this.currentMessage.classList.remove( "present" );
			this.currentMessage.classList.add( "past" );
			this.setForExpiration( this.currentMessage );
		}

	};

	jaby.swipeUp = function swipeUp() {
		this.clearMessage();
	};

	jaby.swipeDown = function swipeDown() {
		this.clearMessage();
	};

	jaby.swipeLeft = function swipeLeft() {
		this.dismissMessage();
	};

	jaby.swipeRight = function swipeRight() {
		this.dismissMessage();
	};

	jaby.tap = function tap() {
		this.dismissMessage();
	};

	jaby.onUserInput = function onUserInput( /* event */) {};

	jaby.onTouch = function onTouch( event ) {

		switch ( event.type ) {
			case "swipeleft":
				this.swipeLeft();
				break;
			case "swiperight":
				this.swipeRight();
				break;
			case "swipeup":
				this.swipeUp();
				break;
			case "swipedown":
				this.swipeDown();
				break;
			default:
				//	Nothing
		}

	};

	jaby.onDocumentKeyDown = function onDocumentKeyDown( event ) {

		var triggered = false;
		var activeElement;
		var hasFocus;

		this.onUserInput( event );

		//	Check if there's a focused element that could be using the keyboard
		activeElement = document.activeElement;
		hasFocus = !!( activeElement && ( activeElement.type || activeElement.href || activeElement.contentEditable !== "inherit" ) );

		//	Disregard the event if there's a focused element or a keyboard modifier key is present
		if ( hasFocus || ( event.shiftKey || event.altKey || event.ctrlKey || event.metaKey ) ) {
			return;
		}

		if ( triggered === false ) {

			//	Assume true and prove false
			triggered = true;

			switch ( event.keyCode ) {

				case 13: //	Return
				case 27: //	ESC
				case 32: //	Space
				case 35: //	End
				case 36: //	Home
					this.tap();
					break;

				case 37: //	Left
					this.swipeLeft();
					break;

				case 39: //	Right
					this.swipeRight();
					break;

				case 33: //	Page Up
				case 38: //	Up
					this.swipeUp();
					break;

				case 34: //	Page Down
				case 40: //	Down
					this.swipeDown();
					break;

				default:
					triggered = false;
			}

		}

		//	If the input resulted in a triggered action we should prevent the browsers default behavior
		if ( triggered ) {
			event.preventDefault();
		}

	};

	jaby.onWindowResize = function onWindowResize( /* event */) {

		this.layout();

	};

	jaby.onPageVisibilityChange = function onPageVisibilityChange( /* event */) {

		var isHidden = document.webkitHidden || document.msHidden || document.hidden;

		//	If, after clicking a link or similar and we're coming back,
		//	focus the document.body to ensure we can use keyboard shortcuts
		if ( isHidden === false && document.activeElement !== document.body ) {
			document.activeElement.blur();
			document.body.focus();
		}

	};

	jaby.addMessage = function addMessage( content, id ) {

		var newMessage = document.createElement( "section" );

		newMessage.classList.add( "future" );

		if ( id ) {
			newMessage.setAttribute( "id", id );
		}

		this.dom.messages.insertBefore( newMessage, this.currentMessage ? this.currentMessage.nextElementSibling : null );

		content = content || "";
		if ( typeof content === "object" && content instanceof HTMLElement ) {
			newMessage.appendChild( content );
		}
		else {
			newMessage.innerHTML = content;
		}

	};

	jaby.addEventListener = function addEventListener( type, listener, useCapture ) {

		if ( "addEventListener" in window ) {
			( this.dom.wrapper || document.querySelector( ".messenger" ) ).addEventListener( type, listener, useCapture );
		}

	};

	jaby.removeEventListener = function removeEventListener( type, listener, useCapture ) {

		if ( "addEventListener" in window ) {
			( this.dom.wrapper || document.querySelector( ".messenger" ) ).removeEventListener( type, listener, useCapture );
		}

	};

	jaby.onStatus = function onStatus( data ) {
		if ( data && data.message ) {
			this.lastStatus = new Date();
			this.setStatus( data.message );
			this.setActivityLoad( data.usage );
			// console.info( data.timeZoneName ? data.timeZoneName : "no timezone data" );
		}
	};

	jaby.pulseCore = function pulseCore() {
		this.pulse.radius += this.pulse.rate * this.pulse.direction;
		this.inner_core.setAttribute( "r", this.core_radius + this.pulse.radius );
		this.inner_power.setAttribute( "r", this.core_radius + this.pulse.radius );

		if ( this.pulse.radius >= this.pulse.maxRadius || this.pulse.radius <= 0 ) {
			this.pulse.direction *= -1;

			if ( this.pulse.radius <= 0 ) {
				if ( this.pulse.rate < this.pulse.rateGoal ) {
					this.pulse.rate++;
				}
				else {
					if ( this.pulse.rate > this.pulse.rateGoal ) {
						this.pulse.rate--;
					}
				}
			}
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

		this.status();

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
		this.turnOnPolling();
		this.turnOnAnimation();

		this.on = true;
		this.connected = true;

		this.setOrbColor();
		this.raiseOrb();
	};

	jaby.turnOff = function turnOff() {
		this.turnOffPolling();

		this.on = false;
		this.connected = true;

		this.setOrbColor();
		this.raiseOrb();
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

		this.setupMessaging();
		this.setupSocketIO();
		this.setupTimers();
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
			}, function ( /* err */) {
				doStatus();
			}, {
				maximumAge: Infinity,
				timeout: 500
			} );
		}
		else {
			doStatus();
		}

	};

	jaby.cleanupMessages = function cleanupMessages() {

		var messages = this.dom.messages.getElementsByTagName( "section" );
		var i;
		var numElements;
		var message, expirationDate;
		var now = new Date();
		var toRemove = [];
		var messageShown = false;
		var hasFutureMessages = false;

		numElements = messages.length;
		for ( i = 0; i < numElements; i++ ) {
			message = messages[ i ];
			if ( message.classList.contains( "past" ) ) {
				toRemove.push( message );
			}
			else {
				if ( message.classList.contains( "present" ) ) {
					messageShown = true;
				}
				else {
					expirationDate = message.getAttribute( "data-expires" );
					if ( expirationDate && expirationDate < now ) {
						toRemove.push( message );
					}
					else {
						if ( !hasFutureMessages && message.classList.contains( "future" ) ) {
							hasFutureMessages = true;
						}
					}
				}
			}
		}

		numElements = toRemove.length;
		for ( i = 0; i < numElements; i++ ) {
			this.dom.messages.removeChild( toRemove[ i ] );
		}
		toRemove = null;

		if ( !messageShown && hasFutureMessages ) {
			this.showNextMessage();
		}

	};

	jaby.setForExpiration = function setForExpiration( message ) {
		var expires = new Date();
		expires.setSeconds( expires.getSeconds() + 10 );

		if ( message ) {
			message.dataset.expires = expires;
		}
	};

	jaby.insertMessage = function insertMessage( content, id ) {
		this.addMessage( content, id );
	};

	jaby.insertMessageText = function insertMessageText( id, text ) {
		var content = "<p>" + text + "</p>";
		this.insertMessage( content, id );
	};

	jaby.askQuestion = function askQuestion( id, question, answers ) {

		function createQuestion() {

			function answerFunction( question, answer ) {
				return function () {
					self.sendAnswer( question, answer );
					return false;
				};
			}

			var qa = document.createElement( "div" );
			var questionElement = document.createElement( "p" );
			var questionTextNode = document.createTextNode( question );
			var buttonElement, buttonText;
			var answersElement = document.createElement( "div" );
			var i, numAnswers, answer, answerFunc;

			questionElement.appendChild( questionTextNode );
			qa.appendChild( questionElement );

			answersElement.setAttribute( "class", "answers" );

			numAnswers = answers.length;
			for ( i = 0; i < numAnswers; i++ ) {
				answer = answers[ i ];
				answerFunc = answerFunction( id, answer.text );
				buttonElement = document.createElement( "a" );
				buttonElement.addEventListener( "click", answerFunc, false );
				buttonElement.setAttribute( "class", "btn" );
				buttonText = document.createTextNode( answer.text );
				buttonElement.appendChild( buttonText );
				answersElement.appendChild( buttonElement );
			}

			qa.appendChild( answersElement );

			self.insertMessage( qa, id );

			self.messagesTouch.get( "tap" ).set( {
				enable: false
			} );
		}

		var self = this;

		if ( id && !document.getElementById( id ) ) {
			createQuestion();
		}

	};

	jaby.setActivityLoad = function setActivityLoad( usage ) {
		var rateGoal = 5;
		var load = usage && usage.hasOwnProperty( "cpu" ) ? parseFloat( usage.cpu ) : undefined;

		if ( load !== undefined && typeof load === "number" ) {
			rateGoal = Math.round( load / 10 );

			if ( rateGoal < 1 ) {
				rateGoal = 1;
			}
			else {
				if ( rateGoal >= 10 ) {
					rateGoal = 10;
				}
			}
		}

		this.pulse.rateGoal = rateGoal;
	};

	jaby.setStatus = function setStatus( status ) {
		var date = new Date();
		var current_hour = date.getHours();

		if ( current_hour > 19 || current_hour < 5 ) {
			document.body.classList.remove( "twilight" );
			document.body.classList.add( "night" );
		}
		else {
			document.body.classList.remove( "night" );

			if ( current_hour > 17 || current_hour < 4 ) {
				document.body.classList.add( "twilight" );
			}
			else {
				document.body.classList.remove( "twilight" );
			}
		}

		if ( status === "online" ) {
			this.setOnline();
			this.clearWarning();
			this.clearError();
		}
		else {
			if ( status === "offline" ) {
				this.setOffline();
			}
			else {
				this.turnOff();
			}
		}
	};

	jaby.dismissMessage = function dismissMessage() {

		this.pop();
		this.showNextMessage();

	};

	jaby.clearMessage = function clearMessage() {

		this.pop();

	};

	jaby.userRequest = function userRequest() {

		var data = {
			message: "Am I weird?"
		};

		if ( this.connected ) {
			this.socket.emit( "message", data );
		}

	};

	jaby.sendAnswer = function sendAnswer( question, answer ) {
		var envelope = {};

		if ( question && answer && this.connected ) {
			envelope.question = question;
			envelope.answer = answer;

			this.socket.emit( "answer", envelope );
		}

		this.dismissMessage();
	};

	jaby.setupDOM = function setupDOM() {
		var orbComputed;
		var height;
		var sphereHeight;

		this.orb = document.getElementById( "orb" );
		this.rotated_sphere = document.getElementById( "sphere_holes" );
		this.inner_core = document.getElementById( "inner_core" );
		this.inner_power = document.getElementById( "inner_power" );
		this.shadow = document.getElementById( "sphere_shadow" );
		this.sphere = document.getElementById( "jaby_sphere" );
		this.stops = document.getElementsByClassName( "core_color" );
		this.sphere_shine = document.getElementById( "sphere_shine" );
		this.core_radius = parseInt( this.inner_core.getAttribute( "r" ), 10 );

		this.shadowRadiusY = parseFloat( this.shadow.getAttribute( "ry" ) );
		this.shadowRadiusX = parseFloat( this.shadow.getAttribute( "rx" ) );

		orbComputed = window.getComputedStyle( this.orb, null );
		height = parseFloat( orbComputed.getPropertyValue( "height" ) );
		sphereHeight = parseFloat( orbComputed.getPropertyValue( "width" ) );

		this.raisedHeight = height - sphereHeight - this.shadowRadiusY;

		//	Cache references to key DOM elements
		this.dom.theme = document.querySelector( "#theme" );
		this.dom.wrapper = document.querySelector( ".messenger" );
		this.dom.messages = document.querySelector( ".messenger .messages" );

		//	Prevent transitions while we're loading
		this.dom.messages.classList.add( "no-transition" );

	};

	jaby.setupEvents = function setupEvents() {
		var self = this;

		visibly.onVisible( function () {
			self.turnOn.call( self );
		} );

		visibly.onHidden( function () {
			self.turnOff.call( self );
		} );

		visibly.onVisible( function () {
			self.turnOn.call( self );
		} );

		visibly.onHidden( function () {
			self.turnOff.call( self );
		} );

		this.orb.addEventListener( "click", function () {
			self.userRequest.call( self );
		} );
	};

	jaby.setupTimers = function setupTimers() {

		if ( !this.cleanupTimer ) {
			this.cleanupTimer = setInterval( this.cleanupMessages.bind( this ), 1000 );
		}

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

		this.socket.on( "status", function ( status ) {
			self.onStatus.call( self, status );
		} );

		this.socket.on( "question", function ( qa ) {
			self.askQuestion.call( self, qa.id, qa.question, qa.answers );
		} );

		this.socket.on( "reply", function ( reply ) {
			self.insertMessageText.call( self, "test123", reply.message );
		} );

		this.socket.on( "message", function ( message ) {
			self.insertMessage.call( self, message );
		} );

		this.socket.emit( "start" );
	};

	if ( typeof module !== "undefined" && module.exports ) {
		module.exports = jaby;
	}
	if ( window ) {
		window[ exportName ] = jaby;
	}

} )( window, document, "jabyObj" );
