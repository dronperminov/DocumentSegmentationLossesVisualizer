function Number(value) {
    this.value = value
}

function Add(arg1, arg2) {
    this.arg1 = arg1
    this.arg2 = arg2
    this.value = null
}

function Sub(arg1, arg2) {
    this.arg1 = arg1
    this.arg2 = arg2
    this.value = null
}

function Mult(arg1, arg2) {
    this.arg1 = arg1
    this.arg2 = arg2
    this.value = null
}

function Div(arg1, arg2) {
    this.arg1 = arg1
    this.arg2 = arg2
    this.value = null
}

function Max(arg1, arg2) {
    this.arg1 = arg1
    this.arg2 = arg2
    this.value = null
}

function Min(arg1, arg2) {
    this.arg1 = arg1
    this.arg2 = arg2
    this.value = null
}

Number.prototype.Forward = function() {
    this.grad = 0
    return this.value
}

Number.prototype.Backward = function(value) {
    this.grad += value
}


Add.prototype.Forward = function() {
    if (this.value == null) {
        this.grad1 = 1
        this.grad2 = 1
        this.value = this.arg1.Forward() + this.arg2.Forward()
    }

    return this.value
}

Add.prototype.Backward = function(value) {
    this.arg1.Backward(this.grad1 * value)
    this.arg2.Backward(this.grad2 * value)
}


Sub.prototype.Forward = function() {
    if (this.value == null) {
        this.grad1 = 1
        this.grad2 = -1
        this.value = this.arg1.Forward() - this.arg2.Forward()
    }

    return this.value
}

Sub.prototype.Backward = function(value) {
    this.arg1.Backward(this.grad1 * value)
    this.arg2.Backward(this.grad2 * value)
}


Mult.prototype.Forward = function() {
    if (this.value == null) {
        let v1 = this.arg1.Forward()
        let v2 = this.arg2.Forward()

        this.grad1 = v2
        this.grad2 = v1
        this.value = v1 * v2
    }

    return this.value
}

Mult.prototype.Backward = function(value) {
    this.arg1.Backward(this.grad1 * value)
    this.arg2.Backward(this.grad2 * value)
}


Div.prototype.Forward = function() {
    if (this.value == null) {
        let v1 = this.arg1.Forward()
        let v2 = this.arg2.Forward()

        this.grad1 = 1 / v2
        this.grad2 = -v1 / (v2 * v2)
        this.value = v1 / v2
    }

    return this.value
}

Div.prototype.Backward = function(value) {
    this.arg1.Backward(this.grad1 * value)
    this.arg2.Backward(this.grad2 * value)
}


Max.prototype.Forward = function() {
    if (this.value == null) {
        let v1 = this.arg1.Forward()
        let v2 = this.arg2.Forward()

        if (v1 > v2) {
            this.grad1 = 1
            this.grad2 = 0
            this.value = v1
        }
        else {
            this.grad1 = 0
            this.grad2 = 1
            this.value = v2
        }
    }

    return this.value
}

Max.prototype.Backward = function(value) {
    this.arg1.Backward(this.grad1 * value)
    this.arg2.Backward(this.grad2 * value)
}


Min.prototype.Forward = function() {
    if (this.value == null) {
        let v1 = this.arg1.Forward()
        let v2 = this.arg2.Forward()

        if (v1 < v2) {
            this.grad1 = 1
            this.grad2 = 0
            this.value = v1
        }
        else {
            this.grad1 = 0
            this.grad2 = 1
            this.value = v2
        }
    }

    return this.value
}

Min.prototype.Backward = function(value) {
    this.arg1.Backward(this.grad1 * value)
    this.arg2.Backward(this.grad2 * value)
}
