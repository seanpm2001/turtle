(function (window, document, undefined) {
    function xtnd(left, right) {for (var key in right) left[key] = right[key]; return left;}
    function extend(target) {
	if (arguments.length == 2) {xtnd(arguments[0], arguments[1])}
	else if (arguments.length > 2) {
	    for (var i=1; i<arguments.length; i++) {xtnd(target, arguments[i])}
	}
	return target;
    }
    function assertNumber(value, errors, message) {
	if (value === undefined) {return false;}
	if (value !== null && isNaN(parseFloat(value))) {errors.push(message); return false;}
	return true;
    }
    function deprecationWarning(message) {if (console && console.log) {console.log(message);}}
    var tool_base = {
	signal: function signal (method, args) {
	    if (this.event_handlers[method] && this.event_handlers[method].length) {
		for (var key in this.event_handlers[method]) {
		    var obj = this.event_handlers[method][key];
		    obj[method].apply(obj, args);
		}
	    }
	    return;
	},
	use: function use (tools) {
	    extend(this, tools);
	    for (var objname in tools) {
		var obj = tools[objname];
		obj.holder = this;
		for (var i in (obj.signals || [])) {
		    var method = obj.signals[i];
		    this.event_handlers[method] || (this.event_handlers[method] = []);
		    this.event_handlers[method].push(obj)
		}
	    }
	    return this;
	},
	drop: function drop (toolname) {
	    var tool = this[toolname];
	    delete(this[toolname]);
	    for (var i in (tool.signals || [])) {
		var method = tool.signals[i];
		if (this.event_handlers[method]) {
		    this.event_handlers[method] = this.event_handlers[method].filter(
			function(handler, idx) {
			    if (handler === tool) {return false}
			    return true;
			});
		    if (this.event_handlers[method].length == 0) {
			delete(this.event_handlers[method]);
		    }
		}
	    }
	    delete(tool["holder"]);
	},
    };
    function Turtle(/*degrees, [x, y]*/) {
	return extend(this, {
	    event_handlers: {},
	    _position: {},
	    _home: (arguments.length == 2) ? {
		direction: arguments[0],
		x: arguments[1][0], 
		y: arguments[1][1]
	    } : {direction: 0, x: 0, y: 0}
	}).clear();
    }
    extend(Turtle.prototype, tool_base, {
	home: function home() {
	    this.position(this._home);
	    return this;
	},
	position: function position () {
	    var newposition = arguments[0];
	    if (typeof newposition === "object") {
		var errors = [];
		if (assertNumber(newposition.direction, errors, "direction must be a number")) {
		    this._position.direction = parseFloat(newposition.direction) % 360;
		    (this._position.direction < 0) && (this._position.direction += 360);
		}
		if (assertNumber(newposition.x, errors, "x must be a number")) {
		    this._position.x = parseFloat(newposition.x);
		}
		if (assertNumber(newposition.y, errors, "y must be a number")) {
		    this._position.y = parseFloat(newposition.y);
		}
		if (errors.length) {
		    throw new TypeError(errors.join("\n"));
		}
		return this;
	    }
	    return [this._position.x, this._position.y];
	},
	turn: function turn (degrees) {
	    this.position({direction:this._position.direction + parseFloat(degrees)});
	    this.signal("turn", arguments);
	    return this;
	},
	move: function move (pixels) {
	    var p = parseFloat(pixels);
	    this.position({
		x: Math.cos(this.directionInRadians()) * p + this._position.x,
		y: Math.sin(this.directionInRadians()) * p + this._position.y
	    });
	    this.signal("move", arguments);
	    return this;
	},

/* will deprecate and remove the following methods someday soon */

	clear: function clear () {
	    deprecationWarning(
		"clear() is deprecated.  Use home() instead");
	    this.home();
	    this.signal("clear", arguments);
	    return this;
	},
	direction: function direction () {
	    return this._position.direction;
	},
	directionInRadians: function directionInRadians () {
	    return this.direction()*Math.PI/180
	},
	x: function x () {
	    return this._position.x;
	},
	y: function y () {
	    return this._position.y;
	},
	setDirection: function setDirection (degrees) {
	    deprecationWarning(
		"setDirection(degrees) is deprecated.  Use position({direction:degrees})");
	    this.position({"direction" : degrees});
	    return this;
	},
	setPosition: function setPosition (x, y) {
	    deprecationWarning(
		"setPosition(x, y) is deprecated.  Use position({x:pixels, y:pixels})");
	    this.position({"x":x, "y":y});
	    return this;
	},
	clone: function clone () {
	    return extend(new Turtle(), {
		_position: extend({}, this._position),
		home: extend({}, this.home),
		event_handlers: extend({}, this.event_handlers)
	    });
	},
	render: function render () {
	    this.signal("render", arguments);
	},
    });
    function TurtlePen() {
	return extend(this, {vertexes: []});
    }
    extend(TurtlePen.prototype, {
	signals: ["move", "render"],
	addVertex: function addVertex() {
	    this.vertexes.push(this.holder.clone());
	    return this;
	},
	down: function down() {
	    this.addVertex();
	    this.penIsDown = true;
	},
	up: function up() {
	    this.penIsDown = false;
	},
	move: function move(pixels) {
	    if (this.penIsDown) {
		this.addVertex();
	    }
	    return this;
	},
	render: function render(ctx /*, limit*/) {
	    if (this.vertexes && this.vertexes.length) {
		var limit = arguments[1];
		if (limit === undefined || limit > this.vertexes.length)
		    limit = this.vertexes.length;		    
		ctx.beginPath();
		ctx.moveTo(this.vertexes[0].x(), this.vertexes[0].y());
		for(var i = 1; i < limit; i++) {
		    ctx.lineTo(this.vertexes[i].x(), this.vertexes[i].y());
		}
		ctx.stroke();
	    }
	},
	animation: function animation(ctx) {
	    var pen = this;
	    return {
		cursor: 0,
		limit: pen.vertexes.length,
		next: function next() {
		    this.cursor += 1;
		    pen.render(ctx, this.cursor);
		    return this.cursor < this.limit;
		}
	    };
	}
    });
    function TurtleCostume () {
	return extend(this, {event_handlers: {}});
    }
    extend(TurtleCostume.prototype, tool_base, {
	signals: ["render"],
	render: function (ctx /*, turtle*/) {
	    var turtle = arguments[1] || this.holder;
	    ctx.save();
	    ctx.translate(turtle.x(), turtle.y());
	    ctx.rotate(turtle.directionInRadians());
	    this.signal("render", [ctx]);
	    ctx.restore();
	},
    });
    function TurtleRecorder () {
	return extend(this, {queue: []});
    }
    extend(TurtleRecorder.prototype, {
	clear: function clear () {
	    this.queue.push(function (view) {
		view.clear();
		return;
	    });
	},
	move: function move (pixels) {
	    this.queue.push(function (view) {
		view.move(pixels);
		return;
	    });
	},
	turn: function turn (degrees) {
	    this.queue.push(function (view) {
		view.turn(degrees);
		return;
	    });
	},
	penDown: function penDown () {
	    this.queue.push(function (view) {
		view.penDown();
		return;
	    });
	},
	penUp: function penUp () {
	    this.queue.push(function (view) {
		view.penDown();
		return;
	    });
	},
	setPosition: function setPosition (x, y) {
	    this.queue.push(function (view) {
		view.setPosition(x, y);
		return;
	    });
	},
	setDirection: function setDirection (degrees) {
	    this.queue.push(function (view) {
		view.setDirection(degrees);
		return;
	    });
        },
	play: function play () {
	    for (var i = 0; i < this.queue.length; i++) {
		for (var j = 0; j < arguments.length; j++) {
		    this.queue[i].apply(this.queue, [arguments[j]]);
		}
	    }
	},
        playback: function playback (args) {
	    var opts = extend({
		interval: 100,
		opsPerStep: 10
	    }, args);

            if(!opts.view) {
                console.log('No rendering target found!');

                return;
            }

	    var queue = this.queue, i = 0, limit = this.queue.length;
	    (function animate() {
		do { queue[i++].apply(queue, [opts.view]) }
		while(--limit && limit % opts.opsPerStep);
		if (limit)
		    setTimeout(animate, opts.interval);
	    })();
	    return;
        }
    });
    function LogView (out) { // for use with FireBug console or similar
	var self = this;
	self.clear = function () {
	    out.log('clear();');
	    return;
	};
	self.move = function (pixels) {
	    out.log('move('+pixels+');');
	    return;
	};
	self.turn = function (degrees) {
	    out.log('turn('+degrees+');');
	    return;
	};
	self.penDown = function () {
	    out.log('penDown();');
	    return;
	};
	self.penUp = function () {
	    out.log('penUp();');
	    return
	};
	self.setPosition = function (x, y) {
	    out.log('setPosition('+x+', '+y+');');
	    return;
	};
	self.setDirection = function (degrees) {
	    out.log('setDirection('+degrees+');');
	    return;
	};
    }
    function CanvasView (canvas) {
	var self = this;
	self.turtle = new Turtle(0, [
	    parseInt(canvas.width/2), 
	    parseInt(canvas.height/2)
	]);
	self.canvas = canvas;
	self.ctx = canvas.getContext('2d');
	self.penIsDown = false;
	self.clear = function () {
	    self.turtle.clear();
	    self.ctx.clearRect(0, 0, canvas.width, canvas.height);
	    return;
	};
	self.move = function (pixels) {
	    if (self.penIsDown) {
		self.ctx.beginPath();
		self.ctx.moveTo(self.turtle.x(), self.turtle.y());
		self.turtle.move(pixels);
		self.ctx.lineTo(self.turtle.x(), self.turtle.y());
		self.ctx.stroke();
	    } else {
		self.ctx.moveTo(self.turtle.x(), self.turtle.y());
	    }
	    return;
	};
	self.turn = function (degrees) {
	    self.turtle.turn(degrees);
	    return;
	};
	self.penDown = function () {
	    self.penIsDown = true;
	    return;
	};
	self.penUp = function () {
	    self.penIsDown = false;
	    return
	};
	self.setPosition = function (x, y) {
	    self.turtle.position({"x":x, "y":y});
	    self.ctx.moveTo(x, y);
	    return;
	};
        self.setDirection = function(degrees) {
	    self.turtle.position({direction:degrees});
	    return;
        };
    }
    window.Turtle = Turtle;
    extend(window.Turtle, {
	Pen: TurtlePen,
	Costume: TurtleCostume,
	Recorder: TurtleRecorder
    });
    window.Commands = function Commands () {
	deprecationWarning("Commands() is deprecated.  See Turtle.Recorder() instead.");
	return new Turtle.Recorder();
    };
    window.LogView = LogView;
    window.CanvasView = CanvasView;
})(this, this.document);
