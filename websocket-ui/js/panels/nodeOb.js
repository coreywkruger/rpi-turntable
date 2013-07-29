nodeOb = function( canvas, id, posX, posY ) {
	
	var _this = this;
	this.ID = id;
	this.backColor = '#555555';
	this.fillColor = '#777799';
	this.selColor = '#AAAACC';
	this.canvas = canvas;
	
	this.buffer = 10;
	this.radIO = 5;
	this.position = { x : posX, y : posY };
	this.width = 200;
	this.height = 25;
	this.minWidth = 200;
	this.minHeight = 2 * _this.buffer;
	this.zIndex = 0;
	this.selected = false;
	
	this.STATES = {0: 'MOVING', 1: 'SCALING', 2: 'NULL', 3: 'WIRE'};
	this.state = 'NULL';

	var rect = _this.canvas.getBoundingClientRect();
	this.ctx = canvas.getContext("2d");
	_this.ctx.roundRect(_this.position.x, _this.position.y, _this.width, _this.height, _this.buffer);
	//this.ctx.fillRect(this.position.x, this.position.y, this.width, this.height);
	
	//Menu stuff
	this.dropDownMenus = {};
	this.textFields = {};
	this.checkBoxes = {};
	this.sliders = {};
	
	this.lenDropDownMenus = 0;
	this.lenTextFields = 0;
	this.lenCheckBoxes = 0;
	this.lenSliders = 0;
	//End Menu stuff
	
	
	//Connection stuff
	this.inputs = {};
	this.inputPoints = {};
	this.inputFields = {};
	this.outputs = {};
	this.outputPoints = {};
	
	this.scriptFields = {};
	
	this.activeInputIndex = -1;
	this.activeOutputIndex = -1;
	
	this.lenInputPoints = 0;
	this.lenOutputPoints = 0;
	this.lenInputs = 0;
	this.lenOutputs = 0;
	//End Connection stuff
	
	this.prevScale = {"x": _this.width, "y": _this.height};
	this.prevPosition = { "x": _this.position.x, "y": _this.position.y};
	this.dragStart = { "x": 0, "y": 0};
	this.dragEnd = { "x": 0, "y": 0};
	this.direction = { "x": 0, "y": 0};
	
	this.updateSize = function (x, y) {
		_this.width = _this.prevScale.x + x;
		_this.height = _this.prevScale.y + y;
		if (_this.width < _this.minWidth) _this.width = _this.minWidth;
		if (_this.height < _this.minHeight) _this.height = _this.minHeight;

	}
	
	this.updatePosition = function (x, y) {
		_this.position.x = _this.prevPosition.x + x;
		_this.position.y = _this.prevPosition.y + y;
		_this.arrangeMenus();
	}
	
	this.keepLastPosition = function () {
		_this.prevPosition.x = _this.position.x;
		_this.prevPosition.y = _this.position.y;
		_this.prevScale.x = _this.width;
		_this.prevScale.y = _this.height;
		_this.arrangeMenus();
	}
	
	this.redrawMe = function (x, y, w, h) {
		if (_this.selected) _this.ctx.fillStyle = _this.selColor;
		if (!_this.selected) _this.ctx.fillStyle = _this.fillColor;
		_this.ctx.roundRect(x, y, w, h, _this.buffer);
		
		_this.ctx.beginPath();
		_this.ctx.moveTo(_this.position.x, _this.position.y + _this.buffer + _this.buffer / 2);
		_this.ctx.lineTo(_this.position.x + _this.width, _this.position.y + _this.buffer + _this.buffer / 2);
		_this.ctx.lineWidth = 2;
		_this.ctx.strokeStyle = '#444444';
		_this.ctx.stroke();
		
		_this.drawInputPoints();
		_this.drawOutputPoints();
		_this.arrangeMenus();
	}
	
	this.getAttrs = function () {
		return {
		x: _this.position.x,
		y: _this.position.y,
		w: _this.width,
		h: _this.height,
		radIO: _this.radIO,
		state: _this.state
		}
	}
	
	this.arrangeMenus = function () {
		var key;
		var i = 0;
		for (key in _this.inputFields) {
			if(_this.inputFields.hasOwnProperty(key)) {
				_this.inputFields[key].style.left = _this.buffer + _this.position.x + "px";
				_this.inputFields[key].style.top = _this.position.y + 3 * _this.buffer + 2 * _this.buffer * i + i * 2 * _this.radIO - 12 + "px";
				i++;
			}
		}
		if (_this.scriptFields[0] == undefined) return;
		_this.scriptFields[0 + ''].style.top = _this.position.y + 3 * _this.buffer - 12 + "px";
		_this.scriptFields[0 + ''].style.left = _this.position.x + _this.width - 100 + "px";
		_this.scriptFields[0 + ''].style.width = 70 + "px";
	}
	
	//Graphical Input points are managed here (not real connections).
	this.addInputPoint = function () {
		_this.inputPoints[_this.lenInputPoints + ''] = _this.lenInputPoints + '';
		_this.addInputField();
		_this.lenInputPoints++;
		_this.minSizeAdjustment();
		_this.arrangeMenus();
	}
	
	this.addInputField = function () {
		var textIn = document.createElement('input');
		textIn.setAttribute('id', 'input-' + _this.ID + '-' + _this.lenInputPoints);
		document.body.appendChild(textIn);
		_this.inputFields[_this.lenInputPoints + ''] = textIn, {'drawFlag': 1} ;
		textIn.style.position = "absolute";
		textIn.value = 0;
		textIn.style.width = 30 + "px";
	}
	
	this.addScriptField = function () {
		var textIn = document.createElement('input');
		textIn.setAttribute('id', 'Script-input-' + _this.ID);
		document.body.appendChild(textIn);
		_this.scriptFields[0 + ''] = textIn;
		textIn.style.position = "absolute";
		textIn.value = 0;
		textIn.style.width = 110 + "px";
	}
	
	//Real connections to other nodes are recorded via this function. Tested as input or output (sourceIO) to the current node. Indeces are also recorded (IOindex).
	this.addConnection = function ( connectedNode, otherIndex, localIndex, inputOrOutput ) {
		if (inputOrOutput) {
			_this.inputs[_this.lenInputs] = { "node": connectedNode, "otherIndex": otherIndex, "localIndex": localIndex };
			_this.lenInputs++;
		} else if (!inputOrOutput) {
			_this.outputs[_this.lenOutputs] = { "node": connectedNode, "otherIndex": otherIndex, "localIndex": localIndex };
			_this.lenOutputs++;
		}
	}
	
	this.drawInputPoints = function () {
		var i;
		for (i = 0; i < _this.lenInputPoints; i++) {
			_this.ctx.circleDraw(_this.position.x, _this.position.y + 3 * _this.buffer + 2 * _this.buffer * i + i * 2 * _this.radIO, _this.radIO);
			_this.inputPoints[i + ''] = {"x": _this.position.x, "y": _this.position.y + 3 * _this.buffer + 2 * _this.buffer * i + i * 2 * _this.radIO};
		}
	}
	
	//Graphical Output points are managed here (not real connections).
	this.addOutputPoint = function () {
		_this.outputPoints[_this.lenOutputPoints + ''] = _this.lenOutputPoints + '';
		_this.lenOutputPoints++;
		_this.minSizeAdjustment();
		_this.arrangeMenus();
	}
	
	this.drawOutputPoints = function () {
		var i;
		for (i = 0; i < _this.lenOutputPoints; i++) {
			_this.ctx.circleDraw(_this.position.x + _this.width, _this.position.y + 3 * _this.buffer + 2 * _this.buffer * i + i * 2 * _this.radIO, _this.radIO);
			_this.outputPoints[i + ''] = {"x": _this.position.x + _this.width, "y": _this.position.y + 3 * _this.buffer + 2 * _this.buffer * i + i * 2 * _this.radIO};
		}
	}
	
	this.getIORad = function () {
		return _this.radIO;
	}
	
	this.setState = function (i) {
		_this.state = _this.STATES[i];
	}
	
	this.getState = function () {
		return _this.state;
	}
	
	this.setActiveInputIndex = function (i) {
		_this.activeInputIndex = i;
	}
	
	this.setActiveOutputIndex = function (i) {
		_this.activeOutputIndex = i;
	}
	
	this.getActiveInputIndex = function () {
		return _this.activeInputIndex;
	}
	
	this.getActiveOutputIndex = function () {
		return _this.activeOutputIndex;
	}
	
	this.getInputs = function () {
		return _this.inputs;
	}
	
	this.getOutputs = function () {
		return _this.outputs;
	}
	
	this.getLenInputs = function () {
		return _this.lenInputs;
	}
	
	this.getLenOutputs = function () {
		return _this.lenOutputs;
	}
	
	this.setZIndex = function (z) {
		return _this.z;
	}
	
	this.getZIndex = function (z) {
		_this.zIndex = z;
	}
	
	this.setSelected = function (flag) {
		_this.selected = flag;
	}
	
	this.getSelected = function () {
		return _this.selected;
	}
	
	this.minSizeAdjustment = function () {
		var newInHeight = 3 * _this.buffer + 2 * _this.buffer * _this.lenInputPoints + _this.lenInputPoints * 2 * _this.radIO;
		var newOutHeight = 3 * _this.buffer + 2 * _this.buffer * _this.lenOutputPoints + _this.lenOutputPoints * 2 * _this.radIO;
		if (newInHeight > newOutHeight) {
			_this.height = _this.minHeight = newInHeight;
		} else {
			_this.height = _this.minHeight = newOutHeight;
		}
		_this.prevScale.y = _this.height;
	}
}

nodeOb.prototype.foo = function foo(){}

CanvasRenderingContext2D.prototype.circleDraw = function (x, y, r) {
	this.beginPath();
	this.arc(x, y, r, 0, 2 * Math.PI, false);
	this.lineWidth = 2;
	this.strokeStyle = '#444444';
	this.fill();
	this.stroke();
}

CanvasRenderingContext2D.prototype.roundRect = function (x, y, w, h, r) {
	if (w < 2 * r) r = w / 2;
	if (h < 2 * r) r = h / 2;
	this.beginPath();
	this.moveTo(x+r, y);
	this.arcTo(x+w, y,   x+w, y+h, r);
	this.arcTo(x+w, y+h, x,   y+h, r);
	this.arcTo(x,   y+h, x,   y,   r);
	this.arcTo(x,   y,   x+w, y,   r);

	this.strokeStyle = '#444444';
	this.lineWidth = 2;
	this.closePath();

	this.fill();
	this.stroke();
	return this;
}