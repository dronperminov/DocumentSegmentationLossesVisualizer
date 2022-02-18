class UnaryOperation {
    constructor(arg) {
        this.arg = arg
    }

    Backward(value) {
        this.arg.Backward(this.grad * value)
    }
}

class BinaryOperation {
    constructor(arg1, arg2) {
        this.arg1 = arg1
        this.arg2 = arg2
    }

    Backward(value) {
        this.arg1.Backward(this.grad1 * value)
        this.arg2.Backward(this.grad2 * value)
    }
}

class Variable {
    constructor(value, name) {
        this.value = value
        this.name = name
    }

    Forward() {
        this.grad = 0
        return this.value
    }

    Backward(value) {
        this.grad += value
    }

    SetValue(value) {
        this.value = value
    }
}

class Constant {
    constructor(value) {
        this.value = value
    }

    Forward() {
        return this.value
    }

    Backward(value) {

    }

    SetValue(value) {
        this.value = value
    }
}

class Add extends BinaryOperation {
    constructor(arg1, arg2) {
        super(arg1, arg2)
        this.grad1 = 1
        this.grad2 = 1
    }

    Forward() {
        return this.arg1.Forward() + this.arg2.Forward()
    }
}

class Sub extends BinaryOperation {
    constructor(arg1, arg2) {
        super(arg1, arg2)
        this.grad1 = 1
        this.grad2 = -1
    }

    Forward() {
        return this.arg1.Forward() - this.arg2.Forward()
    }
}

class Mult extends BinaryOperation {
    Forward() {
        let v1 = this.arg1.Forward()
        let v2 = this.arg2.Forward()

        this.grad1 = v2
        this.grad2 = v1
        return v1 * v2
    }
}

class Div extends BinaryOperation {
    Forward() {
        let v1 = this.arg1.Forward()
        let v2 = this.arg2.Forward()

        this.grad1 = 1 / v2
        this.grad2 = -v1 / (v2 * v2)
        return v1 / v2
    }
}

class Max extends BinaryOperation {
    Forward() {
        let v1 = this.arg1.Forward()
        let v2 = this.arg2.Forward()

        let sign = Math.sign(v1 - v2)

        this.grad1 = 0.5 * (1 + sign)
        this.grad2 = 0.5 * (1 - sign)

        return Math.max(v1, v2)
    }
}

class Min extends BinaryOperation {
    Forward() {
        let v1 = this.arg1.Forward()
        let v2 = this.arg2.Forward()

        let sign = Math.sign(v1 - v2)

        this.grad1 = 0.5 * (1 - sign)
        this.grad2 = 0.5 * (1 + sign)

        return Math.min(v1, v2)
    }
}

class Sum {
    constructor(...args) {
        this.args = args
    }

    Forward() {
        let sum = 0;

        for (let arg of this.args)
            sum += arg.Forward()

        return sum
    }

    Backward(value) {
        for (let arg of this.args)
            arg.Backward(value)
    }
}

class Clamp extends UnaryOperation {
    constructor(arg, threshold = 0) {
        super(arg)
        this.threshold = threshold
    }

    Forward() {
        let value = this.arg.Forward()
        this.grad = 0.5 * (1 + Math.sign(value - this.threshold))
        return Math.max(value, this.threshold)
    }
}

class Square extends UnaryOperation {
    Forward() {
        let v = this.arg.Forward()
        this.grad = 2 * v
        return v * v
    }
}

class Atan extends UnaryOperation {
    Forward() {
        let value = Math.atan(this.arg.Forward())
        this.grad = 1 / (value * value + 1)
        return value
    }
}

class Power extends UnaryOperation {
    constructor(arg, n) {
        super(arg)
        this.n = n
    }

    Forward() {
        let value = this.arg.Forward()
        this.grad = this.n * Math.pow(value, this.n - 1)
        return Math.pow(value, this.n)
    }
}

class Log extends UnaryOperation {
    Forward() {
        let value = this.arg.Forward() + 1e-8
        this.grad = 1 / value
        return Math.log(value)
    }
}

class Cosh extends UnaryOperation {
    Forward() {
        let value = this.arg.Forward()
        this.grad = Math.sinh(value)
        return Math.cosh(value)
    }
}

class Abs extends UnaryOperation {
    Forward() {
        let value = this.arg.Forward()
        this.grad = Math.sign(value)
        return Math.abs(value)
    }
}

class Sign extends UnaryOperation {
    constructor(arg) {
        super(arg)
        this.grad = 0
    }

    Forward() {
        return Math.sign(this.arg.Forward())
    }
}

class NoGrad {
    constructor(arg) {
        this.arg = arg
    }

    Forward() {
        return this.arg.Forward()
    }

    Backward(value) {

    }
}

// (x2 - x1)^2 + (y2 - y1)^2
class SquareNorm {
    constructor(x1, x2, y1, y2) {
        this.x1 = x1
        this.x2 = x2
        this.y1 = y1
        this.y2 = y2
    }

    Forward() {
        let dx = this.x2.Forward() - this.x1.Forward()
        let dy = this.y2.Forward() - this.y1.Forward()

        this.grad_x1 = -2 * dx
        this.grad_x2 = 2 * dx

        this.grad_y1 = -2 * dy
        this.grad_y2 = 2 * dy

        return dx * dx + dy * dy
    }

    Backward = function(value) {
        this.x1.Backward(this.grad_x1 * value)
        this.x2.Backward(this.grad_x2 * value)
        this.y1.Backward(this.grad_y1 * value)
        this.y2.Backward(this.grad_y2 * value)
    }
}

const HALF = new Constant(0.5)
const ONE = new Constant(1)
const TWO = new Constant(2)
const THREE = new Constant(3)
const FOUR = new Constant(4)
const EPS = new Constant(1e-8)

const PI = new Constant(Math.PI)
const TWO_OVER_PI = new Constant(2 / Math.PI)
