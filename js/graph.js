function IsNegativeExpression(s) {
    if (!s.startsWith('-(') || !s.endsWith(')'))
        return false

    let count = 0

    for (let i = 2; i < s.length - 1; i++) {
        if (s[i] == '(')
            count++
        else if (s[i] == ')')
            count--

        if (count < 0)
            return false
    }

    return count == 0
}

function NegateExpression(s) {
    return IsNegativeExpression(s) ? s.substr(2, s.length - 3) : `-(${s})`
}

function BackwardAnalytic(arg, agrad, value) {
    if (agrad == '0' || value == '0')
        return

    if (value == '-1' && agrad == '-1') {
        arg.BackwardAnalytic('1')
    }
    else if (value == '1') {
        arg.BackwardAnalytic(agrad)
    }
    else if (agrad == '1') {
        arg.BackwardAnalytic(value)
    }
    else if (value == '-1') {
        arg.BackwardAnalytic(NegateExpression(agrad))
    }
    else if (agrad == '-1') {
        arg.BackwardAnalytic(NegateExpression(value))
    }
    else if (!IsNegativeExpression(agrad) && IsNegativeExpression(value)) {
        arg.BackwardAnalytic(`-(${agrad})∙${NegateExpression(value)}`)
    }
    else {
        arg.BackwardAnalytic(`(${agrad})∙${value}`)
    }
}

class UnaryOperation {
    constructor(arg, name = '') {
        this.arg = arg
        this.name = name
    }

    Backward(value) {
        this.arg.Backward(this.grad * value)
    }

    BackwardAnalytic(value) {
        BackwardAnalytic(this.arg, this.agrad, value)
    }
}

class BinaryOperation {
    constructor(arg1, arg2, name = '') {
        this.arg1 = arg1
        this.arg2 = arg2
        this.name = name
    }

    Backward(value) {
        this.arg1.Backward(this.grad1 * value)
        this.arg2.Backward(this.grad2 * value)
    }

    BackwardAnalytic(value) {
        BackwardAnalytic(this.arg1, this.agrad1, value)
        BackwardAnalytic(this.arg2, this.agrad2, value)
    }
}

class Variable {
    constructor(value, name = '') {
        this.value = value
        this.name = name
        this.agrad = []
    }

    Forward() {
        this.grad = 0
        this.agrad = []
        return this.value
    }

    Backward(value) {
        this.grad += value
    }

    BackwardAnalytic(value) {
        this.agrad.push(value)
    }

    SetValue(value) {
        this.value = value
    }

    GetGradAnalytic() {
        if (this.agrad.length == 0)
            return '0'

        let grads = [this.agrad[0]]

        for (let i = 1; i < this.agrad.length; i++)
            if (this.agrad[i].startsWith('-'))
                grads.push(this.agrad[i])
            else
                grads.push('+' + this.agrad[i])

        return grads.join('')
    }
}

class Constant {
    constructor(value, name = '') {
        this.value = value
        this.name = name == '' ? `${value}` : name
    }

    Forward() {
        return this.value
    }

    Backward(value) {

    }

    BackwardAnalytic(value) {

    }

    SetValue(value) {
        this.value = value
    }
}

class Add extends BinaryOperation {
    constructor(arg1, arg2, name = '') {
        super(arg1, arg2, name)

        this.grad1 = 1
        this.grad2 = 1

        this.agrad1 = '1'
        this.agrad2 = '1'
    }

    Forward() {
        return this.arg1.Forward() + this.arg2.Forward()
    }
}

class Sub extends BinaryOperation {
    constructor(arg1, arg2, name = '') {
        super(arg1, arg2, name)

        this.grad1 = 1
        this.grad2 = -1

        this.agrad1 = '1'
        this.agrad2 = '-1'
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

        this.agrad1 = this.arg2.name
        this.agrad2 = this.arg1.name

        return v1 * v2
    }
}

class Div extends BinaryOperation {
    Forward() {
        let v1 = this.arg1.Forward()
        let v2 = this.arg2.Forward()

        this.grad1 = 1 / v2
        this.grad2 = -v1 / (v2 * v2)

        this.agrad1 = `1/${this.arg2.name}`
        this.agrad2 = this.name == '' ? `-(${this.arg1.name}/(${this.arg2.name})^2)` : `-(${this.name}/${this.arg2.name})`

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

        this.agrad1 = `(1+sign(${this.arg1.name}-${this.arg2.name}))/2`
        this.agrad2 = `(1-sign(${this.arg1.name}-${this.arg2.name}))/2`

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

        this.agrad1 = `(1-sign(${this.arg1.name}-${this.arg2.name}))/2`
        this.agrad2 = `(1+sign(${this.arg1.name}-${this.arg2.name}))/2`

        return Math.min(v1, v2)
    }
}

class Sum {
    constructor(...args) {
        this.args = args
        this.name = ''

        if (typeof this.args[this.args.length - 1] === 'string')
            this.name = this.args.pop()
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

    BackwardAnalytic(value) {
        for (let arg of this.args) {
            arg.BackwardAnalytic(value)
        }
    }
}

class Neg extends UnaryOperation {
    constructor(arg, name) {
        super(arg, name)
        this.grad = -1
        this.agrad = '-1'
    }

    Forward() {
        return -this.arg.Forward()
    }
}

class Clamp extends UnaryOperation {
    constructor(arg, threshold = 0, name = '') {
        super(arg, name)
        this.threshold = threshold
    }

    Forward() {
        let value = this.arg.Forward()

        this.grad = value >= this.threshold ? 1 : 0
        this.agrad = `{█(1, ${this.arg.name}>=${this.threshold}@0, иначе)┤`

        return Math.max(value, this.threshold)
    }
}

class Square extends UnaryOperation {
    Forward() {
        let v = this.arg.Forward()
        this.grad = 2 * v
        this.agrad = `2∙${this.arg.name}`
        return v * v
    }
}

class Atan extends UnaryOperation {
    Forward() {
        let value = Math.atan(this.arg.Forward())
        this.grad = 1 / (value * value + 1)
        this.agrad = `1/(${this.arg.name}^2)`
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
        this.agrad = `${this.n}∙(${this.arg.name}^${this.n - 1})`
        return Math.pow(value, this.n)
    }
}

class Log extends UnaryOperation {
    Forward() {
        let value = this.arg.Forward() + 1e-8
        this.grad = 1 / value
        this.agrad = `1/${this.arg.name}`
        return Math.log(value)
    }
}

class Cosh extends UnaryOperation {
    Forward() {
        let value = this.arg.Forward()
        this.grad = Math.sinh(value)
        this.agrad = `sinh(${this.arg.name})`
        return Math.cosh(value)
    }
}

class Abs extends UnaryOperation {
    Forward() {
        let value = this.arg.Forward()
        this.grad = Math.sign(value)
        this.agrad = `sign(${this.arg.name})`
        return Math.abs(value)
    }
}

class Sign extends UnaryOperation {
    constructor(arg, name = '') {
        super(arg, name)
        this.grad = 0
        this.agrad = '0'
    }

    Forward() {
        return Math.sign(this.arg.Forward())
    }
}

class NoGrad {
    constructor(arg, name) {
        this.arg = arg
        this.name = name
    }

    Forward() {
        return this.arg.Forward()
    }

    Backward(value) {

    }

    BackwardAnalytic(value) {

    }
}

// (x2 - x1)^2 + (y2 - y1)^2
class SquareNorm {
    constructor(x1, x2, y1, y2, name = '') {
        this.x1 = x1
        this.x2 = x2
        this.y1 = y1
        this.y2 = y2
        this.name = name
    }

    Forward() {
        let dx = this.x2.Forward() - this.x1.Forward()
        let dy = this.y2.Forward() - this.y1.Forward()

        this.grad_x1 = -2 * dx
        this.grad_x2 = 2 * dx

        this.grad_y1 = -2 * dy
        this.grad_y2 = 2 * dy

        this.agrad_x1 = `-2∙(${this.x2.name}-${this.x1.name})`
        this.agrad_x2 = `2∙(${this.x2.name}-${this.x1.name})`

        this.agrad_y1 = `-2∙(${this.y2.name}-${this.y1.name})`
        this.agrad_y2 = `2∙(${this.y2.name}-${this.y1.name})`

        return dx * dx + dy * dy
    }

    Backward(value) {
        this.x1.Backward(this.grad_x1 * value)
        this.x2.Backward(this.grad_x2 * value)
        this.y1.Backward(this.grad_y1 * value)
        this.y2.Backward(this.grad_y2 * value)
    }

    BackwardAnalytic(value) {
        BackwardAnalytic(this.x1, this.agrad_x1, value)
        BackwardAnalytic(this.x2, this.agrad_x2, value)
        BackwardAnalytic(this.y1, this.agrad_y1, value)
        BackwardAnalytic(this.y2, this.agrad_y2, value)
    }
}

const HALF = new Constant(0.5)
const ONE = new Constant(1)
const TWO = new Constant(2)
const THREE = new Constant(3)
const FOUR = new Constant(4)
const EPS = new Constant(1e-8, 'eps')

const PI = new Constant(Math.PI, 'π')
const TWO_OVER_PI = new Constant(2 / Math.PI, '2/π')
