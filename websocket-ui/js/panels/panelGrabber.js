"use strict";

function panelGrabber ( canvas ) {
	
	var _this = this;
	this.nodeList = {};
	this.lenNodeList = 0;
	this.canvas = canvas;
	this.position = { x : 0, y : 0 };
	
	var backColor = '#555555';
	this.ctx = _this.canvas.getContext('2d');
	this.netDump;

	this.prevPosition = { "x": 0, "y": 0};
	this.dragStart = { "x": 0, "y": 0};
	this.dragEnd = { "x": 0, "y": 0};
	this.direction = { "x": 0, "y": 0};
	
	this.state = false;
	//this.STATES = {0: 'MOVING', 1:'CLICKED', 2:'LETGO', 3:'NULL'};
	this.selected = 'NULL';
	
	
	function updateNodeAttrs() {
		if (clicked && moving) {
			if (_this.nodeList[_this.selected].getState() == 'MOVING') _this.nodeList[_this.selected].updatePosition(_this.getAdd().x, _this.getAdd().y);
			if (_this.nodeList[_this.selected].getState() == 'SCALING') _this.nodeList[_this.selected].updateSize(_this.getAdd().x, _this.getAdd().y);
			if (_this.nodeList[_this.selected].getState() == 'WIRE') _this.drawNewWire();
		} else if (moving) {
			moving = false;
		}
	}
	
	this.updatePosition = function () {
		_this.direction.x = _this.dragEnd.x - _this.dragStart.x;
		_this.direction.y = _this.dragEnd.y - _this.dragStart.y;
		_this.position.x = _this.prevPosition.x + _this.direction.x;
		_this.position.y = _this.prevPosition.y + _this.direction.y;
		_this.direction.x = 0;
		_this.direction.y = 0;
	}
	
	var clicked, moving;
	function mousedown ( event ) {
		event.stopPropagation();
		event.preventDefault();
		_this.dragStart.x = event.pageX;
		_this.dragStart.y = event.pageY;
		
		if (!clicked) {
			_this.prevPosition.x = _this.dragStart.x;
			_this.prevPosition.y = _this.dragStart.y;
			_this.position.x = _this.dragStart.x;
			_this.position.y = _this.dragStart.y;
			_this.dragEnd.x = _this.dragStart.x;
			_this.dragEnd.y = _this.dragStart.y;
			_this.redrawNodes();
		}
		clicked = true;
		
		/////////////////
		//Getting selected
		
		var corner = 15;
		var key;
		var oldSelectionPresent = false;
		var newSelection = 'NULL';
		var newState = 'NULL';
		var newActiveInputIndex = -1;
		var newActiveOutputIndex = -1;
		/////////////////////////////////////////////////////////
		/////////////////////////////////////////////////////////
		for (key in _this.nodeList) {
			
			var attrs = _this.nodeList[key].getAttrs();
			//BoundingBox level
			if ( _this.testGrab(attrs.x - attrs.radIO, attrs.y - attrs.radIO, attrs.w + 2 * attrs.radIO, attrs.h + 2 * attrs.radIO) ) {
				
				//Main frame level
				if (_this.testGrab(attrs.x, attrs.y, attrs.w, attrs.h)) {
					if (key == _this.selected) {
						oldSelectionPresent = true;
					}
					newSelection = key;
					newState = 0;
				}
				
				//Scaling corner level
				if (_this.testGrab(attrs.x + attrs.w - corner, attrs.y + attrs.h - corner, corner, corner)) {
					console.log('here');
					if (key == _this.selected) {
						oldSelectionPresent = true;
					}
					newSelection = key;
					newState = 1;
				}
				
				var j;
				for (j = 0; j < _this.nodeList[key].lenInputPoints; j++) {
					var node = _this.nodeList[key];
					var inPoint =  node.inputPoints[j + ''];
					if (_this.testGrab(inPoint.x - attrs.radIO, inPoint.y - attrs.radIO, 2 * attrs.radIO + 5, 2 * attrs.radIO + 5)) {
						if (key == _this.selected) {
							oldSelectionPresent = true;
						}
						newSelection = key;
						newState = 3;
						newActiveInputIndex = j;
					}
				}

				for (j = 0; j < _this.nodeList[key].lenOutputPoints; j++) {
					var node = _this.nodeList[key];
					var outPoint =  node.outputPoints[j + ''];
					if (_this.testGrab(outPoint.x - attrs.radIO, outPoint.y - attrs.radIO, 2 * attrs.radIO + 5, 2 * attrs.radIO + 5)) {
						if (key == _this.selected) {
							oldSelectionPresent = true;
						}
						newSelection = key;
						newState = 3;
						newActiveOutputIndex = j;
					}
				}
			}
		}
		if (newSelection == 'NULL') return;
		if (!oldSelectionPresent) {
			_this.selected = newSelection;
			_this.isolateSelected();
		}
		if (newActiveInputIndex != -1) _this.nodeList[_this.selected].setActiveInputIndex(newActiveInputIndex);
		if (newActiveOutputIndex != -1) _this.nodeList[_this.selected].setActiveOutputIndex(newActiveOutputIndex);
		_this.nodeList[_this.selected].setSelected(true);
		_this.nodeList[_this.selected].setState(newState);
		_this.redrawNodes();
		//End getting selected
		/////////////////
	}
	
	function mousemove ( event ) {


		event.stopPropagation();
		event.preventDefault();
		_this.dragEnd.x = event.pageX;
		_this.dragEnd.y = event.pageY;
		if (!clicked) return;
		_this.updatePosition();
		//////////////////
		if (_this.selected == 'NULL') return;
		
		updateNodeAttrs();
		_this.redrawNodes();
		moving = true;
		///////////////////
	}
	
	function mouseup ( event ) {
		event.stopPropagation();
		event.preventDefault();
		_this.prevPosition.x = 0;//_this.position.x;
		_this.prevPosition.y = 0;//_this.position.y;
		
		
		/////////////////////////////////////////////
		/////////////////////////////////////////////
		if (_this.nodeList[_this.selected].getState() == 'WIRE') {
			var key;
			for (key in _this.nodeList) {
				if (key != _this.selected) {
					var j;
					if (_this.nodeList[_this.selected].getActiveOutputIndex() != -1) {
						for (j = 0; j < _this.nodeList[key].lenInputPoints; j++) {
							var node = _this.nodeList[key];
							var inPoint =  node.inputPoints[j + ''];
							if (_this.testGrab(inPoint.x - node.getIORad(), inPoint.y - node.getIORad(), 2 * node.getIORad() + 5, 2 * node.getIORad() + 5)) {
								_this.nodeList[_this.selected].addConnection(key, j, _this.nodeList[_this.selected].getActiveOutputIndex(), false);
								_this.nodeList[key].addConnection(_this.selected, _this.nodeList[_this.selected].getActiveOutputIndex(), j, true);
							
							}
						}
					}
					
					if (_this.nodeList[_this.selected].getActiveInputIndex() != -1) {
						for (j = 0; j < _this.nodeList[key].lenOutputPoints; j++) {
							var node = _this.nodeList[key];
							var outPoint =  node.outputPoints[j + ''];
							if (_this.testGrab(outPoint.x - node.getIORad(), outPoint.y - node.getIORad(), 2 * node.getIORad() + 5, 2 * node.getIORad() + 5)) {
								_this.nodeList[_this.selected].addConnection(key, j, _this.nodeList[_this.selected].getActiveInputIndex(), true);
								_this.nodeList[key].addConnection(_this.selected, _this.nodeList[_this.selected].getActiveInputIndex(), j, false);
							}
						}
					}
				}
			}
		}
		/////////////////////////////////////////////
		/////////////////////////////////////////////
		_this.isolateSelected();
		settleNodes();
		clicked = false;
		if (_this.selected == 'NULL') return;
		_this.nodeList[_this.selected].setState(2);
		_this.nodeList[_this.selected].setActiveInputIndex(-1);
		_this.nodeList[_this.selected].setActiveOutputIndex(-1);
		_this.redrawNodes();
		///////////
		_this.getNetworkInfo();
		///////////
	}
	
	this.canvas.addEventListener('mousedown', mousedown, false);
	document.addEventListener('mousemove', mousemove, false);
	document.addEventListener('mouseup', mouseup, false);
	
	/////////
	this.redrawNodes = function () {
		_this.ctx.fillStyle = backColor;
		_this.ctx.fillRect(0,0,_this.canvas.width, _this.canvas.height);
		_this.ctx.gridDraw(25);
		var key;
		var z = 0;
		for (key in _this.nodeList) {
			if (key != _this.selected && key != null) {
				var attrs = _this.nodeList[key].getAttrs();
				_this.nodeList[key].redrawMe(attrs.x, attrs.y, attrs.w, attrs.h);
				_this.nodeList[key].setZIndex(z + 1);
			}
			z++;
		}
		if (_this.nodeList[_this.selected] == null) return;
		var attrs = _this.nodeList[_this.selected].getAttrs();
		_this.nodeList[_this.selected].redrawMe(attrs.x, attrs.y, attrs.w, attrs.h);
		_this.nodeList[_this.selected].setZIndex(0);
		
		if (_this.nodeList[_this.selected].getState() == 'WIRE') {
			_this.drawNewWire();
		}
		_this.drawConnectionWires();
	}
	
	function settleNodes() {
		var key;
		for (key in _this.nodeList) {
			_this.nodeList[key].keepLastPosition();
		}
	}
	
	this.isolateSelected = function () {
		var key;
		for (key in _this.nodeList) {
			if ( key != _this.selected ) {
				_this.nodeList[key].setSelected(false);
			}
		}	
	}
	
	this.drawNewWire = function () {
		if (_this.nodeList[_this.selected].getActiveInputIndex() != -1) {
			var index = _this.nodeList[_this.selected].getActiveInputIndex();
			var point = _this.nodeList[_this.selected].inputPoints[index];
			var attrs = _this.nodeList[_this.selected].getAttrs();
			_this.ctx.drawBezier(point.x, point.y, _this.position.x, _this.position.y, true);
		}
		if (_this.nodeList[_this.selected].getActiveOutputIndex() != -1) {
			var index = _this.nodeList[_this.selected].getActiveOutputIndex();
			var point = _this.nodeList[_this.selected].outputPoints[index];
			var attrs = _this.nodeList[_this.selected].getAttrs();
			_this.ctx.drawBezier(point.x, point.y, _this.position.x, _this.position.y, false);
		}
	}
	
	this.drawConnectionWires = function () {
		var key, con;
		for (key in _this.nodeList) {
			var outs = _this.nodeList[key].getOutputs();
			for (con in _this.nodeList[key].getOutputs()) {
				var start = _this.nodeList[key].outputPoints[outs[con].localIndex];
				var end = _this.nodeList[outs[con].node].inputPoints[outs[con].otherIndex];
				_this.ctx.drawBezierConnection(start.x, start.y, end.x, end.y);
			}
		}
	}
	
	/////////
	
	this.testGrab = function (x, y, w, h) {
		if (_this.position.x > x && 
			_this.position.x < x + w &&
			_this.position.y > y &&
			_this.position.y < y + h) {
			return true;
		} else {
			return false;
		}
	}
	
	this.addNode = function (nodeOb) {
		_this.nodeList[nodeOb.ID] = nodeOb;
		_this.lenNodeList++;
	}
	
	this.getState = function () {
		return _this.state;
	}
	
	this.getPos = function () {
		return _this.position;
	}
	
	this.getAdd = function () {
		return { "x": _this.dragEnd.x - _this.dragStart.x, "y": _this.dragEnd.y - _this.dragStart.y};
	}
	
	this.setNetworkDump = function setNetworkDump (domElement) {
		
		_this.netDump = domElement;
	}
	
	this.writeToNetDump = function (text) {
		_this.netDump.textContent += text;
	}
	
	this.getNetworkInfo = function () {
		//_this.setNetworkDump('');
		for (var key in _this.nodeList) {
			
			var inputs = _this.nodeList[key].getInputs();
			var outputs = _this.nodeList[key].getOutputs();
			console.log(inputs);
			//_this.setNetworkDump('<br>');
			_this.writeToNetDump(JSON.stringify(inputs));
			//_this.setNetworkDump('<br>');
			_this.writeToNetDump(JSON.stringify(outputs));
//			console.log("INPUTS:");
//			_this.writeToNetDump(json.parse(inputs[0]));
//			
//			console.log("OUTPUTS:");
//			_this.writeToNetDump(outputs[0]);
//			for (con in inputs) {
//				console.log(con);
//			}
		}
	}
}

CanvasRenderingContext2D.prototype.gridDraw = function (s) {
	for (var i = 0; i < this.canvas.height; i += s) {
		this.beginPath();
		this.lineWidth = 2;
		this.strokeStyle = '#444444';
		this.moveTo(0, i);
		this.lineTo(this.canvas.width, i);
		this.stroke();
		this.closePath();
	}
	for (var i = 0; i < this.canvas.width; i += s) {
		this.beginPath();
		this.lineWidth = 1;
		this.strokeStyle = '#444444';
		this.moveTo(i, 0);
		this.lineTo(i, this.canvas.height);
		this.stroke();
		this.closePath();
	}
}

CanvasRenderingContext2D.prototype.drawBezierConnection = function (x, y, ex, ey) {
	this.beginPath();
	this.lineWidth = 2;
	this.strokeStyle = '#222222';
	this.moveTo(x, y);
	var sec = { "x": x + Math.abs(ex - x) / 2, "y": y};
	var thir = { "x": ex - Math.abs(ex - x) / 2, "y": ey};
	this.bezierCurveTo( sec.x, sec.y, thir.x, thir.y, ex, ey );
	this.stroke();
	this.closePath();
}

CanvasRenderingContext2D.prototype.drawBezier = function (x, y, ex, ey, leftRight) {
	this.beginPath();
	this.lineWidth = 2;
	this.strokeStyle = '#222222';
	this.moveTo(x, y);
	var sec, thir, four; 
	if (!leftRight) {
		sec = { "x": x + Math.abs(ex - x) / 2, "y": y};
	} else {
		sec = { "x": x - Math.abs(ex - x) / 2, "y": y};
	}
	thir = { "x": x + (ex - x) / 2, "y": ey};

	this.bezierCurveTo( sec.x, sec.y, thir.x, thir.y, ex, ey );
	this.stroke();
	this.closePath();
}