"use strict";

function panelGrabber ( canvas ) {
	var self = this;

	this.nodeList = {};
	this.lenNodeList = 0;
	this.canvas = canvas;
	this.position = { x : 0, y : 0 };

	this.backColor = '#555555';
	this.toolColor = '#aaaaaa';
	this.ctx = this.canvas.getContext('2d');
	this.ctx.lineCap = "round";
	this.ctx.lineJoin = "round";
	this.netDump;

	this.prevPosition = { "x": 0, "y": 0};
	this.dragStart = { "x": 0, "y": 0};
	this.dragEnd = { "x": 0, "y": 0};
	this.direction = { "x": 0, "y": 0};

	this.state = false;
	//this.STATES = {0: 'MOVING', 1:'CLICKED', 2:'LETGO', 3:'NULL'};
	this.selected = 'NULL';

	this.clicked = undefined;
	this.moving = undefined;

	function mousedown(event) {
		event.stopPropagation();
		event.preventDefault();
		self.dragStart.x = event.pageX;
		self.dragStart.y = event.pageY;

		if (!self.clicked) {
			self.prevPosition.x = self.dragStart.x;
			self.prevPosition.y = self.dragStart.y;
			self.position.x = self.dragStart.x;
			self.position.y = self.dragStart.y;
			self.dragEnd.x = self.dragStart.x;
			self.dragEnd.y = self.dragStart.y;
			self.redrawNodes();
		}
		self.clicked = true;

		/////////////////
		//Getting selected

		var corner = 15;
		var oldSelectionPresent = false;
		var newSelection = 'NULL';
		var newState = 'NULL';
		var newActiveInputIndex = -1;
		var newActiveOutputIndex = -1;
		/////////////////////////////////////////////////////////
		/////////////////////////////////////////////////////////
		for (var key in self.nodeList) {
			var attrs = self.nodeList[key].getAttrs();
			//BoundingBox level
			if ( self.testGrab(attrs.x - attrs.radIO, attrs.y - attrs.radIO, attrs.w + 2 * attrs.radIO, attrs.h + 2 * attrs.radIO) ) {

				//Main frame level
				if (self.testGrab(attrs.x, attrs.y, attrs.w, attrs.h)) {
					if (key == self.selected) {
						oldSelectionPresent = true;
					}
					newSelection = key;
					newState = 0;
				}

				//Scaling corner level
				if (self.testGrab(attrs.x + attrs.w - corner, attrs.y + attrs.h - corner, corner, corner)) {
					if (key == self.selected) {
						oldSelectionPresent = true;
					}
					newSelection = key;
					newState = 1;
				}

				for (var j = 0; j < self.nodeList[key].lenInputPoints; j++) {
					var node = self.nodeList[key];
					var inPoint =  node.inputPoints[j + ''];
					if (self.testGrab(inPoint.x - attrs.radIO, inPoint.y - attrs.radIO, 2 * attrs.radIO + 5, 2 * attrs.radIO + 5)) {
						if (key == self.selected) {
							oldSelectionPresent = true;
						}
						newSelection = key;
						newState = 3;
						newActiveInputIndex = j;
					}
				}

				for (j = 0; j < self.nodeList[key].lenOutputPoints; j++) {
					var node = self.nodeList[key];
					var outPoint =  node.outputPoints[j + ''];
					if (self.testGrab(outPoint.x - attrs.radIO, outPoint.y - attrs.radIO, 2 * attrs.radIO + 5, 2 * attrs.radIO + 5)) {
						if (key == self.selected) {
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
			self.selected = newSelection;
			self.isolateSelected();
		}
		if (newActiveInputIndex != -1) self.nodeList[self.selected].setActiveInputIndex(newActiveInputIndex);
		if (newActiveOutputIndex != -1) self.nodeList[self.selected].setActiveOutputIndex(newActiveOutputIndex);
		self.nodeList[self.selected].setSelected(true);
		self.nodeList[self.selected].setState(newState);
		self.redrawNodes();
		//End getting selected
		/////////////////
	}

	function mousemove ( event ) {
		event.stopPropagation();
		event.preventDefault();
		self.dragEnd.x = event.pageX;
		self.dragEnd.y = event.pageY;
		if (!self.clicked) return;
		self.updatePosition();
		//////////////////
		if (self.selected == 'NULL') return;

		self.updateNodeAttrs();
		self.redrawNodes();
		self.moving = true;
		///////////////////
	}

	function mouseup ( event ) {
		event.stopPropagation();
		event.preventDefault();
		self.prevPosition.x = 0;//self.position.x;
		self.prevPosition.y = 0;//self.position.y;

		/////////////////////////////////////////////
		/////////////////////////////////////////////
		if (self.nodeList[self.selected].getState() == 'WIRE') {
			for (var key in self.nodeList) {
				if (key != self.selected) {
					if (self.nodeList[self.selected].getActiveOutputIndex() != -1) {
						for (var j = 0; j < self.nodeList[key].lenInputPoints; j++) {
							var node = self.nodeList[key];
							var inPoint =  node.inputPoints[j + ''];
							if (self.testGrab(inPoint.x - node.getIORad(), inPoint.y - node.getIORad(), 2 * node.getIORad() + 5, 2 * node.getIORad() + 5)) {
								if (!self.nodeList[key].inputIndexIsTaken(j)) {
									self.nodeList[self.selected].addConnection(key, j, self.nodeList[self.selected].getActiveOutputIndex(), false);
									self.nodeList[key].addConnection(self.selected, self.nodeList[self.selected].getActiveOutputIndex(), j, true);
								}
							}
						}
					}

					if (self.nodeList[self.selected].getActiveInputIndex() != -1) {
						for (var j = 0; j < self.nodeList[key].lenOutputPoints; j++) {
							var node = self.nodeList[key];
							var outPoint =  node.outputPoints[j + ''];
							if (self.testGrab(outPoint.x - node.getIORad(), outPoint.y - node.getIORad(), 2 * node.getIORad() + 5, 2 * node.getIORad() + 5)) {
								self.nodeList[self.selected].addConnection(key, j, self.nodeList[self.selected].getActiveInputIndex(), true);
								self.nodeList[key].addConnection(self.selected, self.nodeList[self.selected].getActiveInputIndex(), j, false);
							}
						}
					}
				}
			}
		}
		/////////////////////////////////////////////
		/////////////////////////////////////////////
		self.isolateSelected();
		self.settleNodes();
		self.clicked = false;
		if (self.selected == 'NULL') return;
		self.nodeList[self.selected].setState(2);
		self.nodeList[self.selected].setActiveInputIndex(-1);
		self.nodeList[self.selected].setActiveOutputIndex(-1);
		self.redrawNodes();
		///////////
		self.getNetworkInfo();
		///////////
	}

	this.canvas.addEventListener('mousedown', mousedown, false);
	document.addEventListener('mousemove', mousemove, false);
	document.addEventListener('mouseup', mouseup, false);
}

panelGrabber.prototype.updateNodeAttrs = function updateNodeAttrs() {
	if (this.clicked && this.moving) {
		if (this.nodeList[this.selected].getState() == 'MOVING') this.nodeList[this.selected].updatePosition(this.getAdd().x, this.getAdd().y);
		if (this.nodeList[this.selected].getState() == 'SCALING') this.nodeList[this.selected].updateSize(this.getAdd().x, this.getAdd().y);
		if (this.nodeList[this.selected].getState() == 'WIRE') this.drawNewWire();
	} else if (this.moving) {
		this.moving = false;
	}
}

panelGrabber.prototype.updatePosition = function () {
	this.direction.x = this.dragEnd.x - this.dragStart.x;
	this.direction.y = this.dragEnd.y - this.dragStart.y;
	this.position.x = this.prevPosition.x + this.direction.x;
	this.position.y = this.prevPosition.y + this.direction.y;
	this.direction.x = 0;
	this.direction.y = 0;
}

/////////
panelGrabber.prototype.redrawNodes = function () {
	this.ctx.fillStyle = this.backColor;
	this.ctx.fillRect(0,0,this.canvas.width, this.canvas.height);
	this.ctx.gridDraw(25);
	var z = 0;
	for (var key in this.nodeList) {
		if (key != this.selected && key != null) {
			var attrs = this.nodeList[key].getAttrs();
			this.nodeList[key].redrawMe(attrs.x, attrs.y, attrs.w, attrs.h);
			this.nodeList[key].setZIndex(z + 1);
		}
		z++;
	}
	if (this.nodeList[this.selected] == null) return;
	var attrs = this.nodeList[this.selected].getAttrs();
	this.nodeList[this.selected].redrawMe(attrs.x, attrs.y, attrs.w, attrs.h);
	this.nodeList[this.selected].setZIndex(0);

	this.drawConnectionWires();
	if (this.nodeList[this.selected].getState() == 'WIRE') {
		this.drawNewWire();
	}
}

panelGrabber.prototype.settleNodes = function settleNodes() {
	for (var key in this.nodeList) {
		this.nodeList[key].keepLastPosition();
	}
}

panelGrabber.prototype.isolateSelected = function () {
	for (var key in this.nodeList) {
		if ( key != this.selected ) {
			this.nodeList[key].setSelected(false);
		}
	}
}

panelGrabber.prototype.drawNewWire = function () {
	if (this.nodeList[this.selected].getActiveInputIndex() != -1) {
		var index = this.nodeList[this.selected].getActiveInputIndex();
		var point = this.nodeList[this.selected].inputPoints[index];
		var attrs = this.nodeList[this.selected].getAttrs();
		this.ctx.drawBezier(point.x, point.y, this.position.x, this.position.y, true);
	}
	if (this.nodeList[this.selected].getActiveOutputIndex() != -1) {
		var index = this.nodeList[this.selected].getActiveOutputIndex();
		var point = this.nodeList[this.selected].outputPoints[index];
		var attrs = this.nodeList[this.selected].getAttrs();
		this.ctx.drawBezier(point.x, point.y, this.position.x, this.position.y, false);
	}
}

panelGrabber.prototype.drawConnectionWires = function () {
	for (var key in this.nodeList) {
		var outs = this.nodeList[key].getOutputs();
		for (var con in this.nodeList[key].getOutputs()) {
			var start = this.nodeList[key].outputPoints[outs[con].localIndex];
			var end = this.nodeList[outs[con].node].inputPoints[outs[con].otherIndex];
			this.ctx.drawBezierConnection(start.x, start.y, end.x, end.y);
		}
	}
}

panelGrabber.prototype.testGrab = function (x, y, w, h) {
	if (this.position.x > x &&
		this.position.x < x + w &&
		this.position.y > y &&
		this.position.y < y + h) {
		return true;
	} else {
		return false;
	}
}

panelGrabber.prototype.addNode = function (nodeOb) {
	this.nodeList[nodeOb.ID] = nodeOb;
	this.lenNodeList++;
}

panelGrabber.prototype.getState = function () {
	return this.state;
}

panelGrabber.prototype.getPos = function () {
	return this.position;
}

panelGrabber.prototype.getAdd = function () {
	return { "x": this.dragEnd.x - this.dragStart.x, "y": this.dragEnd.y - this.dragStart.y};
}

panelGrabber.prototype.setNetworkDump = function setNetworkDump (domElement) {
	this.netDump = domElement;
}

panelGrabber.prototype.writeToNetDump = function (text) {
	this.netDump.innerHTML = text;
}

panelGrabber.prototype.getNetworkInfo = function () {
	this.writeToNetDump(JSON.stringify(''));
	var contents = '';
	for (var key in this.nodeList) {
		var inputs = this.nodeList[key].getInputs();
		var outputs = this.nodeList[key].getOutputs();
		contents += key + ' -inputs: ';
		contents += (JSON.stringify(inputs));
		contents += '<br>';
		contents += key + ' -outputs: ';
		contents += (JSON.stringify(outputs));
		contents += '<br>';
	}
	this.writeToNetDump((contents));
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
	this.lineWidth = 3;
	this.strokeStyle = '#222222';
	this.moveTo(x, y);
	var sec = { "x": x + Math.abs(ex - x) / 2, "y": y};
	var thir = { "x": ex - Math.abs(ex - x) / 2, "y": ey};
	this.bezierCurveTo( sec.x, sec.y, thir.x, thir.y, ex, ey );
	this.stroke();
	this.closePath();
}

CanvasRenderingContext2D.prototype.drawBezier = function (x, y, ex, ey, leftRight) {
	var grd = this.createLinearGradient(x, y, ex, ey);
	grd.addColorStop(0,"#ffffff");
	grd.addColorStop(1,"#000000");
	this.beginPath();
	this.lineWidth = 3;
	this.strokeStyle = grd;
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
