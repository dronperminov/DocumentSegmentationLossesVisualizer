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

function NoGrad(arg) {
    this.arg = arg
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

    if (v1 > v2) {
        this.grad1 = 1
        this.grad2 = 0
        return v1
    }
    else {
        this.grad1 = 0
        this.grad2 = 1
        return v2
    }
}

Min.prototype.Forward = function() {
    let v1 = this.arg1.Forward()
    let v2 = this.arg2.Forward()

    if (v1 < v2) {
        this.grad1 = 1
        this.grad2 = 0
        return v1
    }
    else {
        this.grad1 = 0
        this.grad2 = 1
        return v2
    }
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
    let value = this.arg.Forward()
    this.grad = 1 / value

    return Math.log(value)
}

NoGrad.prototype.Forward = function() {
    return this.arg.Forward()
}

NoGrad.prototype.Backward = function(value) {

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