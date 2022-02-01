function Variable(value, name) {
    this.value = value
}

function Constant(value) {
    this.value = value
}

function Add(arg1, arg2) {
    this.arg1 = arg1
    this.arg2 = arg2

    this.grad1 = 1
    this.grad2 = 1
}

function Sub(arg1, arg2) {
    this.arg1 = arg1
    this.arg2 = arg2

    this.grad1 = 1
    this.grad2 = -1
}

function Sum() {
    this.args = arguments
}

function Mult(arg1, arg2) {
    this.arg1 = arg1
    this.arg2 = arg2
}

function Div(arg1, arg2, no_grad = false) {
    this.arg1 = arg1
    this.arg2 = arg2
}

function Max(arg1, arg2) {
    this.arg1 = arg1
    this.arg2 = arg2
}

function Min(arg1, arg2) {
    this.arg1 = arg1
    this.arg2 = arg2
}

function Clamp(arg, threshold = 0) {
    this.arg = arg
    this.threshold = threshold
}

function Square(arg) {
    this.arg = arg
}

function Atan(arg) {
    this.arg = arg
}

function Power(arg, n) {
    this.arg = arg
    this.n = n
}

function Log(arg) {
    this.arg = arg
}

function Abs(arg) {
    this.arg = arg
}

function Sign(arg) {
    this.arg = arg
    this.grad = 0
}

function NoGrad(arg) {
    this.arg = arg
}

// (x2 - x1)^2 + (y2 - y1)^2
function SquareNorm(x1, x2, y1, y2) {
    this.x1 = x1
    this.x2 = x2
    this.y1 = y1
    this.y2 = y2
}

function BackwardOne(value) {
    this.arg.Backward(this.grad * value)
}

function BackwardTwo(value) {
    this.arg1.Backward(this.grad1 * value)
    this.arg2.Backward(this.grad2 * value)
}

Variable.prototype.SetValue = function(value) {
    this.value = value
}

Variable.prototype.Forward = function() {
    this.grad = 0
    return this.value
}

Variable.prototype.Backward = function(value) {
    this.grad += value
}

Constant.prototype.SetValue = function(value) {
    this.value = value
}

Constant.prototype.Forward = function() {
    return this.value
}

Constant.prototype.Backward = function(value) {

}

Add.prototype.Forward = function() {
    return this.arg1.Forward() + this.arg2.Forward()
}

Sub.prototype.Forward = function() {
    return this.arg1.Forward() - this.arg2.Forward()
}

Sum.prototype.Forward = function() {
    let sum = 0;

    for (let arg of this.args)
        sum += arg.Forward()

    return sum
}

Sum.prototype.Backward = function(value) {
    for (let arg of this.args)
        arg.Backward(value)
}

Mult.prototype.Forward = function() {
    let v1 = this.arg1.Forward()
    let v2 = this.arg2.Forward()

    this.grad1 = v2
    this.grad2 = v1
    return v1 * v2
}

Div.prototype.Forward = function() {
    let v1 = this.arg1.Forward()
    let v2 = this.arg2.Forward()

    this.grad1 = 1 / v2
    this.grad2 = -v1 / (v2 * v2)
    return v1 / v2
}

Max.prototype.Forward = function() {
    let v1 = this.arg1.Forward()
    let v2 = this.arg2.Forward()

    let sign = Math.sign(v1 - v2)

    this.grad1 = 0.5 * (1 + sign)
    this.grad2 = 0.5 * (1 - sign)

    return Math.max(v1, v2)
}

Min.prototype.Forward = function() {
    let v1 = this.arg1.Forward()
    let v2 = this.arg2.Forward()

    let sign = Math.sign(v1 - v2)

    this.grad2 = 0.5 * (1 + sign)
    this.grad1 = 0.5 * (1 - sign)

    return Math.min(v1, v2)
}

Clamp.prototype.Forward = function() {
    let value = this.arg.Forward()

    if (value > this.threshold) {
        this.grad = 1
        return value
    }
    else {
        this.grad = 0
        return 0
    }
}

Square.prototype.Forward = function() {
    let v = this.arg.Forward()
    this.grad = 2 * v
    return v * v
}

Atan.prototype.Forward = function() {
    let value = Math.atan(this.arg.Forward())
    this.grad = 1 / (value * value + 1)

    return value
}

Power.prototype.Forward = function() {
    let value = this.arg.Forward()

    this.grad = this.n * Math.pow(value, this.n - 1)
    return Math.pow(value, this.n)
}

Log.prototype.Forward = function() {
    let value = this.arg.Forward() + 1e-8
    this.grad = 1 / value

    return Math.log(value)
}

Abs.prototype.Forward = function() {
    let value = this.arg.Forward()
    this.grad = Math.sign(value)
    return Math.abs(value)
}

Sign.prototype.Forward = function() {
    return Math.sign(this.arg.Forward())
}

NoGrad.prototype.Forward = function() {
    return this.arg.Forward()
}

NoGrad.prototype.Backward = function(value) {

}

SquareNorm.prototype.Forward = function() {
    let x1 = this.x1.Forward()
    let x2 = this.x2.Forward()
    let y1 = this.y1.Forward()
    let y2 = this.y2.Forward()

    let dx = x2 - x1
    let dy = y2 - y1

    this.grad_x1 = -2 * dx
    this.grad_x2 = 2 * dx

    this.grad_y1 = -2 * dy
    this.grad_y2 = 2 * dy

    return dx * dx + dy * dy
}

SquareNorm.prototype.Backward = function(value) {
    this.x1.Backward(this.grad_x1 * value)
    this.x2.Backward(this.grad_x2 * value)
    this.y1.Backward(this.grad_y1 * value)
    this.y2.Backward(this.grad_y2 * value)
}

Add.prototype.Backward = BackwardTwo
Sub.prototype.Backward = BackwardTwo
Mult.prototype.Backward = BackwardTwo
Div.prototype.Backward = BackwardTwo
Max.prototype.Backward = BackwardTwo
Min.prototype.Backward = BackwardTwo
Clamp.prototype.Backward = BackwardOne
Square.prototype.Backward = BackwardOne
Atan.prototype.Backward = BackwardOne
Power.prototype.Backward = BackwardOne
Log.prototype.Backward = BackwardOne
Abs.prototype.Backward = BackwardOne
Sign.prototype.Backward = BackwardOne

const ONE = new Constant(1)
const TWO = new Constant(2)
const THREE = new Constant(3)
const FOUR = new Constant(4)
const EPS = new Constant(1e-8)